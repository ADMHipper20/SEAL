import pandas as pd
import numpy as np

SENSORS = ["temperature_c", "salinity_ppt", "ph", "dissolved_oxygen_mgl", "ammonia_mgl"]

def load_and_clean_data(filepath: str) -> pd.DataFrame:
    """
    Loads raw sensor CSV, converts timestamps, and handles initial missing values.
    """
    df = pd.read_csv(filepath)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.set_index('timestamp').sort_index()
    
    # Keep only the hardware sensor columns
    df = df[SENSORS]
    return df

def apply_smoothing(df: pd.DataFrame, method="hourly_median") -> pd.DataFrame:
    """
    Smooths high-frequency sensor noise to create stable inputs for the ML model.
    """
    if method == "hourly_median":
        # Group by 1-hour windows and take the median to ignore random physical spikes
        smoothed = df.resample("1h").median()
        # Interpolate small gaps (e.g., if sensors went offline for 2 hours)
        smoothed = smoothed.interpolate(limit=3, limit_direction="both")
        
    elif method == "ema_30min":
        # Exponential Moving Average for real-time 30-minute action windows
        smoothed = df.ewm(span=30).mean()
        
    else:
        smoothed = df

    return smoothed.ffill().bfill()

if __name__ == "__main__":
    # Test the preprocessing script
    raw_df = load_and_clean_data("../../../Claude/train_placeholder.csv")
    clean_df = apply_smoothing(raw_df)
    print("Preprocessed Data Shape:", clean_df.shape)
    print(clean_df.head())