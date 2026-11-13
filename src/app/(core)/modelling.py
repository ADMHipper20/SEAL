import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.api import VAR
import warnings

warnings.filterwarnings("ignore")


def train_sarima_model(series: pd.Series, order=(1, 1, 1), seasonal_order=(1, 0, 1, 48)):
    """
    Trains a SARIMA model with s=48 (24-hour cycle on 30-minute bins).
    """
    model = SARIMAX(
        series,
        order=order,
        seasonal_order=seasonal_order,
        enforce_stationarity=False,
        enforce_invertibility=False,
    )
    return model.fit(disp=False, maxiter=40)


def forecast_sarima(fitted_model, steps=6):
    """Predicts the next 'steps' 30-minute bins into the future."""
    return fitted_model.forecast(steps=steps)


def train_var_model(dataframe: pd.DataFrame, exog=None):
    """
    Trains a Vector Autoregression (VAR) model across the 5 water-quality sensors.
    """
    model = VAR(dataframe, exog=exog)
    best_lag = max(1, min(8, model.select_order(8).aic))
    return model.fit(best_lag), best_lag


def forecast_var(fitted_model, current_data: np.ndarray, steps=6, exog_future=None):
    """Predicts the next 'steps' 30-minute bins for all variables in the VAR model."""
    return fitted_model.forecast(current_data, steps=steps, exog_future=exog_future)
