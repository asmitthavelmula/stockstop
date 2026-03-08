import pandas as pd
from sklearn.linear_model import LogisticRegression


def run_logistic(df: pd.DataFrame) -> pd.DataFrame:
    """Train logistic regression to generate buy probability and signal.

    Label: buy_label = 1 if expected_return > 8 else 0
    Adds:
      - buy_probability
      - buy_signal (STRONG BUY/BUY/HOLD/AVOID)
    """
    df = df.copy()
    try:
        if df.empty:
            df['buy_probability'] = pd.NA
            df['buy_signal'] = None
            return df

        df['buy_label'] = (df.get('expected_return', 0) > 8).astype(int)
        features = df[['pe_ratio', 'price_range', 'volatility_ratio', 'cluster']].fillna(0)
        features['cluster'] = pd.to_numeric(features['cluster'], errors='coerce').fillna(0)

        probs = [0.0] * len(df)
        # only fit if we have at least two classes
        if df['buy_label'].nunique() > 1:
            model = LogisticRegression(solver='liblinear')
            model.fit(features, df['buy_label'])
            probs = model.predict_proba(features)[:, 1]

        df['buy_probability'] = probs

        def signal(p):
            if p > 0.7:
                return 'STRONG BUY'
            if p > 0.5:
                return 'BUY'
            if p > 0.3:
                return 'HOLD'
            return 'AVOID'

        df['buy_signal'] = df['buy_probability'].apply(signal)
    except Exception:
        df['buy_probability'] = pd.NA
        df['buy_signal'] = None
    return df
