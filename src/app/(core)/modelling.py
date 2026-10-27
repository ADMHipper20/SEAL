import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.api import VAR
import warnings
warnings.filterwarnings("ignore")

def train_sarima_model(series: pd.Series, order=(1, 0, 1), seasonal_order=(1, 0, 1, 24)):
    """
    Trains a SARIMA model. 
    seasonal_order uses 's=24' because pH and Ammonia have 24-hour daily cycles.
    """
    model = SARIMAX(
        series, 
        order=order, 
        seasonal_order=seasonal_order, 
        enforce_stationarity=False, 
        enforce_invertibility=False
    )
    fitted_model = model.fit(disp=False)
    return fitted_model

def forecast_sarima(fitted_model, steps=3):
    """Predicts the next 'steps' hours into the future."""
    forecast = fitted_model.forecast(steps=steps)
    return forecast

def train_var_model(dataframe: pd.DataFrame):
    """
    Trains a Vector Autoregression (VAR) model for multivariate forecasting 
    (e.g., Temperature and Dissolved Oxygen interacting together).
    """
    model = VAR(dataframe)
    # Automatically select the best lag order based on AIC
    best_lag = model.select_order(12).aic
    best_lag = max(1, best_lag) 
    
    fitted_model = model.fit(best_lag)
    return fitted_model, best_lag

def forecast_var(fitted_model, current_data: np.ndarray, steps=3):
    """Predicts the next 'steps' hours for all variables in the VAR model."""
    forecast = fitted_model.forecast(current_data, steps=steps)
    return forecast

if __name__ == "__main__":
    from preprocessing import load_and_clean_data, apply_smoothing
    
    # 1. Prepare Data
    df = load_and_clean_data("../../../Claude/train_placeholder.csv")
    df_hourly = apply_smoothing(df, method="hourly_median")
    
    # 2. Train SARIMA for Ammonia (Cyclical biological variable)
    print("Training SARIMA for Ammonia...")
    ammonia_model = train_sarima_model(df_hourly['ammonia_mgl'])
    ammonia_pred = forecast_sarima(ammonia_model, steps=3)
    print(f"Ammonia Forecast (Next 3 hours): \n{ammonia_pred}\n")
    
    # 3. Train VAR for Temperature & Oxygen (Interacting physical variables)
    print("Training VAR for Temperature and Oxygen...")
    var_data = df_hourly[['temperature_c', 'dissolved_oxygen_mgl']]
    var_model, lag = train_var_model(var_data)
    
    # Needs the last 'lag' rows to predict the future
    recent_data = var_data.values[-lag:]
    var_pred = forecast_var(var_model, recent_data, steps=3)
    print(f"VAR Forecast (Next 3 hours) [Temp, DO]: \n{var_pred}")