import warnings
import numpy as np
import pandas as pd
from statsmodels.tsa.api import VAR
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore")


def fourier_terms(index: pd.DatetimeIndex, k_harmonics: int = 2) -> np.ndarray:
    """Daily Fourier harmonics (sin/cos pairs for 24 h cycle)."""
    minutes = (index.hour * 60 + index.minute).values
    cols = []
    for k in range(1, k_harmonics + 1):
        angle = 2 * np.pi * k * minutes / 1440.0
        cols.append(np.sin(angle))
        cols.append(np.cos(angle))
    return np.column_stack(cols)


def train_arima_harmonics(series: pd.Series, exog: np.ndarray, order=(2, 1, 2)):
    """
    Trains an ARIMA + daily Fourier harmonics model (selected for temperature_c & ph in Notebook 02).
    """
    model = SARIMAX(
        series.values,
        exog=exog,
        order=order,
        enforce_stationarity=False,
        enforce_invertibility=False,
    )
    return model.fit(disp=False, maxiter=50)


def train_sarima_model(series: pd.Series, order=(1, 1, 1), seasonal_order=(1, 0, 1, 48)):
    """Trains a SARIMA model with s=48 (24-hour cycle on 30-minute bins)."""
    model = SARIMAX(
        series.values,
        order=order,
        seasonal_order=seasonal_order,
        enforce_stationarity=False,
        enforce_invertibility=False,
    )
    return model.fit(disp=False, maxiter=40)


def forecast_sarima(fitted_model, steps=12, exog_future=None):
    """Predicts the next 'steps' 30-minute bins into the future."""
    return np.asarray(fitted_model.forecast(steps=steps, exog=exog_future), dtype=float)


def train_var_model(dataframe: pd.DataFrame, exog=None, maxlags: int = 11):
    """
    Trains a Vector Autoregression (VAR) model across the 3 automated water-quality sensors.
    """
    model = VAR(dataframe.values, exog=exog)
    best_lag = max(1, min(maxlags, model.select_order(maxlags).aic))
    return model.fit(best_lag), best_lag


def forecast_var(fitted_model, current_data: np.ndarray, steps=12, exog_future=None):
    """Predicts the next 'steps' 30-minute bins for all 3 sensors in the VAR model."""
    return fitted_model.forecast(current_data, steps=steps, exog_future=exog_future)
