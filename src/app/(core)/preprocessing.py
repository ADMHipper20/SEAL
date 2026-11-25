import pandas as pd

SENSORS = ["temperature_c", "ph", "turbidity_ntu"]


def load_and_clean_data(filepath: str) -> pd.DataFrame:
    """
    Loads raw 3-sensor CSV, normalizes timestamps to GMT+7 (WIB), and keeps exact §4.1 columns.
    """
    df = pd.read_csv(filepath)
    ts = pd.to_datetime(df["timestamp"])
    if ts.dt.tz is not None:
        ts = ts.dt.tz_convert("Asia/Jakarta").dt.tz_localize(None)
    df["timestamp"] = ts
    df = df.set_index("timestamp").sort_index()
    return df[SENSORS]


def apply_smoothing(df: pd.DataFrame, method="30min_median") -> pd.DataFrame:
    """
    Smooths 5-minute raw readings into 30-minute medians (PLANS.md §4.2, Decision D2).
    """
    if method == "30min_median":
        spacing = df.index.to_series().diff().median()
        if spacing > pd.Timedelta("30min"):
            raise ValueError(f"R4 violation: median spacing {spacing} is coarser than 30 min.")
        g = df.resample("30min")
        smoothed = g.median().where(g.count() >= 3)
        smoothed = smoothed.interpolate(limit=6, limit_direction="both")
    else:
        smoothed = df

    return smoothed.ffill().bfill()


if __name__ == "__main__":
    raw_df = load_and_clean_data("../../../data/sensor_log_placeholder.csv")
    clean_df = apply_smoothing(raw_df)
    print("Preprocessed Data Shape:", clean_df.shape)
    print("Columns:", list(clean_df.columns))
    print(clean_df.head())
