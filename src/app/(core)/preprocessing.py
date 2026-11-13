import pandas as pd

SENSORS = ["temperature_c", "salinity_ppt", "ph", "dissolved_oxygen_mgl", "turbidity_ntu"]


def load_and_clean_data(filepath: str) -> pd.DataFrame:
    """
    Loads raw sensor CSV, converts timestamps, and keeps exact §4.1 columns.
    """
    df = pd.read_csv(filepath)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.set_index("timestamp").sort_index()
    return df[SENSORS]


def apply_smoothing(df: pd.DataFrame, method="30min_median") -> pd.DataFrame:
    """
    Smooths 5-minute raw readings into 30-minute medians (PLANS.md §4.2).
    """
    if method == "30min_median":
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
    print(clean_df.head())
