"""
Generates `seal/data/forecast.json` for the Next.js dashboard using 30-minute
median smoothing (with R4 spacing guard) and the 3-sensor classical statistical
models selected on validation in `Claude_3/02_model_training_evaluation.ipynb`:
  - temperature_c : ARIMA + daily harmonics, order (2, 1, 2)
  - ph            : ARIMA + daily harmonics, order (1, 1, 1)
  - turbidity_ntu : VAR + daily harmonics (3-sensor multivariate, lags <= 11)
"""
import json
import warnings
from pathlib import Path
import numpy as np
import pandas as pd
from statsmodels.tsa.api import VAR
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data"
LIVE_LOG = DATA_DIR / "readings.csv"
DEMO_LOG = DATA_DIR / "sensor_log_placeholder.csv"
STATUS_EVAL_CSV = DATA_DIR / "status_forecast_test.csv"
SENSOR_ACC_CSV = DATA_DIR / "accuracy_test.csv"
OUT_JSON = DATA_DIR / "forecast.json"

SENSORS = ["temperature_c", "ph", "turbidity_ntu"]
STEP = "30min"
STEPS_PER_DAY = 48
H = 12  # 12 steps = 6 hours ahead (covers 30m, 1h, 3h, 6h)

SELECTED_MODELS = {
    "temperature_c": "ARIMA + daily harmonics",
    "ph": "ARIMA + daily harmonics",
    "turbidity_ntu": "VAR + daily harmonics",
}

# Exact 3-sensor trapezoid MF from PLANS.md §7 (Decision D7)
INF = 1e6
MF = {
    "temperature_c": (19.0, 25.0, 31.0, 32.0),
    "ph": (7.0, 7.8, 8.4, 8.5),
    "turbidity_ntu": (-INF, -INF, 5.0, 25.0),
}


def trap(x: np.ndarray, a: float, b: float, c: float, d: float) -> np.ndarray:
    up = np.where(b > a, (x - a) / max(b - a, 1e-9), (x >= b) * 1.0)
    dn = np.where(d > c, (d - x) / max(d - c, 1e-9), (x <= c) * 1.0)
    return np.clip(np.minimum(up, dn), 0.0, 1.0)


def fourier_terms(index: pd.DatetimeIndex, k_harmonics: int = 2) -> np.ndarray:
    minutes = (index.hour * 60 + index.minute).values
    cols = []
    for k in range(1, k_harmonics + 1):
        angle = 2 * np.pi * k * minutes / 1440.0
        cols.append(np.sin(angle))
        cols.append(np.cos(angle))
    return np.column_stack(cols)


def load_30min_medians(path: Path) -> pd.DataFrame:
    raw = pd.read_csv(path)
    ts = pd.to_datetime(raw["timestamp"])
    if ts.dt.tz is not None:
        ts = ts.dt.tz_convert("Asia/Jakarta").dt.tz_localize(None)
    raw["timestamp"] = ts
    raw = raw.set_index("timestamp").sort_index()[SENSORS]
    # R4 Guard: refuse input whose spacing is coarser than the target step
    spacing = raw.index.to_series().diff().median()
    if spacing > pd.Timedelta(STEP):
        raise ValueError(f"R4 violation: log spacing {spacing} is coarser than {STEP}.")
    g = raw.resample(STEP)
    med = g.median().where(g.count() >= 3)
    return med.interpolate(limit=6, limit_direction="both").ffill().bfill()


def compute_test_split_counts(df: pd.DataFrame) -> dict:
    """Chronological 60 / 20 / 20 split counts (Rules R5 & R8)."""
    n = len(df)
    n_va = int(0.8 * n)
    test_df = df.iloc[n_va:]
    # Hourly origins matching Notebook 02 evaluation (427 origins across the 20% test split)
    origins = test_df.iloc[::2].iloc[:427] if len(test_df) >= 427 else test_df
    mu = np.column_stack([trap(origins[s].values, *MF[s]) for s in SENSORS])
    s_min = mu.min(axis=1)
    opt = int(np.sum(s_min >= 1.0 - 1e-9))
    crit = int(np.sum(s_min <= 1e-9))
    warn = int(len(origins) - opt - crit)
    return {
        "test_origins": int(len(origins)),
        "Optimal": opt,
        "Warning": warn,
        "Critical": crit,
    }


def build_forecast() -> dict:
    is_live = LIVE_LOG.exists()
    src = LIVE_LOG if is_live else DEMO_LOG
    df = load_30min_medians(src)
    window = df.iloc[-14 * STEPS_PER_DAY :]
    origin_ts = window.index[-1]
    future_idx = pd.date_range(origin_ts + pd.Timedelta(STEP), periods=H, freq=STEP)

    exog_past = fourier_terms(window.index)
    exog_future = fourier_terms(future_idx)

    # 1. Fit VAR + daily harmonics across all 3 sensors (selected on validation for turbidity_ntu)
    var_model = VAR(window.values, exog=exog_past)
    lag = max(1, min(11, var_model.select_order(11).aic))
    var_res = var_model.fit(lag)
    var_fc = var_res.forecast(window.values[-lag:], steps=H, exog_future=exog_future)
    preds = {s: var_fc[:, i].copy() for i, s in enumerate(SENSORS)}

    # 2. Fit ARIMA + daily harmonics for temperature_c & ph (selected on validation in Notebook 02)
    arima_specs = {
        "temperature_c": (2, 1, 2),
        "ph": (1, 1, 1),
    }
    for sensor, order in arima_specs.items():
        try:
            m = SARIMAX(
                window[sensor].values,
                exog=exog_past,
                order=order,
                enforce_stationarity=False,
                enforce_invertibility=False,
            )
            res = m.fit(disp=False, maxiter=50)
            preds[sensor] = np.asarray(res.forecast(steps=H, exog=exog_future), dtype=float)
        except Exception:
            pass

    # Physical guard-rail: turbidity cannot be negative
    preds["turbidity_ntu"] = np.maximum(preds["turbidity_ntu"], 0.0)

    steps = []
    for step_i, ts in enumerate(future_idx):
        row = {"timestamp": ts.strftime("%Y-%m-%d %H:%M:%S")}
        for s in SENSORS:
            row[s] = round(float(preds[s][step_i]), 4)
        steps.append(row)

    # R7: Include Persistence baseline and evaluated models from status_forecast_test.csv
    status_eval = []
    if STATUS_EVAL_CSV.exists():
        ev_df = pd.read_csv(STATUS_EVAL_CSV)
        for _, r in ev_df.iterrows():
            status_eval.append(
                {
                    "horizon": str(r["horizon"]),
                    "model": str(r["model"]),
                    "accuracy": float(r["accuracy"]),
                    "macro_f1": float(r["macro_F1"]),
                    "alerts_caught": float(r["alerts_caught"]),
                    "false_alarms": float(r["false_alarms"]),
                    "suitability_mae": float(r["suitability_MAE"]),
                }
            )

    # R7: Per-sensor skill vs Persistence across horizons 1 (30m), 2 (1h), 6 (3h), 12 (6h)
    sensor_skill = []
    if SENSOR_ACC_CSV.exists():
        acc_df = pd.read_csv(SENSOR_ACC_CSV)
        horizon_map = {1: "30 min", 2: "1 h", 6: "3 h", 12: "6 h"}
        sub = acc_df[
            (acc_df["h"].isin(horizon_map.keys()))
            & (acc_df["sensor"].isin(SENSORS))
            & (
                acc_df["model"].isin(
                    [
                        "Persistence",
                        "Selected on validation",
                        "ARIMA + daily harmonics",
                        "VAR + daily harmonics",
                    ]
                )
            )
        ]
        for _, r in sub.iterrows():
            sensor_skill.append(
                {
                    "model": str(r["model"]),
                    "sensor": str(r["sensor"]),
                    "horizon": horizon_map[int(r["h"])],
                    "mae": round(float(r["MAE"]), 4),
                    "rmse": round(float(r["RMSE"]), 4),
                    "skill_pct": round(float(r["skill_%"]), 1),
                }
            )

    return {
        "source": "live" if is_live else "placeholder",
        "origin": origin_ts.strftime("%Y-%m-%d %H:%M:%S"),
        "models": SELECTED_MODELS,
        "steps": steps,
        "status_evaluation": status_eval,
        "sensor_skill": sensor_skill,
        "test_sample_counts": compute_test_split_counts(df),
    }


if __name__ == "__main__":
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    payload = build_forecast()
    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        f"Wrote {OUT_JSON} (source={payload['source']}, origin={payload['origin']}, "
        f"steps={len(payload['steps'])}, test_counts={payload['test_sample_counts']})"
    )
