import pandas as pd
from sklearn.linear_model import LinearRegression


def run_linear_regression(df: pd.DataFrame) -> pd.DataFrame:
    """Train a LinearRegression model to predict current_price.

    Features: pe_ratio, price_range, volatility_ratio, cluster
    Adds columns:
      - predicted_price
      - expected_return (%)
    """
    # operate on a copy to avoid mutating original
    df = df.copy()
    try:
        if df.empty:
            df['predicted_price'] = pd.NA
            df['expected_return'] = pd.NA
            return df

        features = df[['pe_ratio', 'price_range', 'volatility_ratio', 'cluster']].fillna(0)
        target = df['current_price']

        # cluster may be non-numeric; coerce
        features['cluster'] = pd.to_numeric(features['cluster'], errors='coerce').fillna(0)

        model = LinearRegression()
        model.fit(features, target)

        preds = model.predict(features)
        df['predicted_price'] = preds
        # Handle division by zero for expected_return
        df['expected_return'] = 0.0
        mask = df['current_price'] > 0
        df.loc[mask, 'expected_return'] = ((df.loc[mask, 'predicted_price'] - df.loc[mask, 'current_price']) / df.loc[mask, 'current_price']) * 100
    except Exception:
        # in case of any error, still add columns so consumer won't crash
        df['predicted_price'] = pd.NA
        df['expected_return'] = pd.NA
    return df
