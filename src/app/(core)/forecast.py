"""
Generates `seal/data/forecast.json` for the Next.js dashboard using the
30-minute median smoothing (with R4 spacing guard) and SARIMA / VAR + daily
harmonics models selected on validation in `Claude/02_model_training_evaluation.ipynb`.
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

SENSORS = ["temperature_c", "salinity_ppt", "ph", "dissolved_oxygen_mgl", "ammonia_mgl"]
STEP = "30min"
STEPS_PER_DAY = 48
H = 12  # 12 steps = 6 hours ahead (covers 30m, 1h, 3h, 6h per PLANS.md §8)

SELECTED_MODELS = {
    "temperature_c": "VAR + daily harmonics",
    "salinity_ppt": "SARIMA (s=48)",
    "ph": "VAR + daily harmonics",
    "dissolved_oxygen_mgl": "VAR + daily harmonics",
    "ammonia_mgl": "SARIMA (s=48)",
}


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
    raw["timestamp"] = pd.to_datetime(raw["timestamp"])
    raw = raw.set_index("timestamp").sort_index()[SENSORS]
    # R4 Guard: refuse input whose spacing is coarser than the target step
    spacing = raw.index.to_series().diff().median()
    if spacing > pd.Timedelta(STEP):
        raise ValueError(f"R4 violation: log spacing {spacing} is coarser than {STEP}.")
    g = raw.resample(STEP)
    med = g.median().where(g.count() >= 3)
    return med.interpolate(limit=6, limit_direction="both").ffill().bfill()


def build_forecast() -> dict:
    is_live = LIVE_LOG.exists()
    src = LIVE_LOG if is_live else DEMO_LOG
    df = load_30min_medians(src)
    window = df.iloc[-14 * STEPS_PER_DAY :]
    origin_ts = window.index[-1]
    future_idx = pd.date_range(origin_ts + pd.Timedelta(STEP), periods=H, freq=STEP)

    # 1. Fit VAR + daily harmonics across all 5 sensors
    exog_past = fourier_terms(window.index)
    exog_future = fourier_terms(future_idx)
    var_model = VAR(window.values, exog=exog_past)
    lag = max(1, min(8, var_model.select_order(8).aic))
    var_res = var_model.fit(lag)
    var_fc = var_res.forecast(window.values[-lag:], steps=H, exog_future=exog_future)
    preds = {s: var_fc[:, i].copy() for i, s in enumerate(SENSORS)}

    # 2. Fit SARIMA for salinity and ammonia (selected on validation)
    sarima_specs = {
        "salinity_ppt": ((2, 1, 0), (1, 0, 0, STEPS_PER_DAY)),
        "ammonia_mgl": ((1, 0, 1), (1, 1, 1, STEPS_PER_DAY)),
    }
    for sensor, (order, sorder) in sarima_specs.items():
        try:
            m = SARIMAX(
                window[sensor].values[-7 * STEPS_PER_DAY :],
                order=order,
                seasonal_order=sorder,
                enforce_stationarity=False,
                enforce_invertibility=False,
            )
            res = m.fit(disp=False, maxiter=40)
            preds[sensor] = np.asarray(res.forecast(steps=H), dtype=float)
        except Exception:
            pass

    steps = []
    for step_i, ts in enumerate(future_idx):
        row = {"timestamp": ts.strftime("%Y-%m-%d %H:%M:%S")}
        for s in SENSORS:
            row[s] = round(float(preds[s][step_i]), 4)
        steps.append(row)

    # R7: Include Persistence baseline and all evaluated models from status_forecast_test.csv
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
            & (acc_df["model"].isin(["Persistence", "Selected on validation", "VAR + daily harmonics", "SARIMA (s=48)"]))
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
        # R8: Report sample sizes from notebook 02 §8 test origins
        "test_sample_counts": {
            "test_origins": 427,
            "Optimal": 376,
            "Warning": 44,
            "Critical": 7,
        },
    }


if __name__ == "__main__":
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    payload = build_forecast()
    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_JSON} (source={payload['source']}, origin={payload['origin']}, steps={len(payload['steps'])})")
