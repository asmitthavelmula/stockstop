from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from portfolios.services.stock_service import StockService
from sklearn.linear_model import LinearRegression
import numpy as np
import logging

logger = logging.getLogger(__name__)

GOLD_TICKER = 'GOLDBEES.NS'
SILVER_TICKER = 'SILVERBEES.NS'

@api_view(['GET'])
def analysis(request):
    try:
        # We explicitly fetch 365 days of data for the 1-year analysis
        past_days = 365
        df_g = StockService.fetch_historical_data(GOLD_TICKER, past_days=past_days)
        df_s = StockService.fetch_historical_data(SILVER_TICKER, past_days=past_days)
        
        if df_g is None or df_g.empty or df_s is None or df_s.empty:
            return Response({'error': 'Insufficient data from NSE for Gold/Silver.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Align data lengths
        len_min = min(len(df_g), len(df_s))
        if len_min < 10:
            return Response({'error': 'Not enough data points for regression and correlation.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # GOLDBEES is roughly 0.01 grams of gold. To get the price of 10g of 24k gold, multiply by ~1000.
        # SILVERBEES is roughly 1 gram of silver. To get the price of 1kg of silver, multiply by ~1000.
        # We will apply a multiplier to the prices to match the raw spot market as requested by the user.
        GOLD_MULTIPLIER = 1000
        SILVER_MULTIPLIER = 1000

        g_prices = df_g['Close'].values[-len_min:].astype(float) * GOLD_MULTIPLIER
        s_prices = df_s['Close'].values[-len_min:].astype(float) * SILVER_MULTIPLIER
        dates = df_g.index[-len_min:]
        
        # 1. Linear Regression (independently for trendlines, or one vs other)
        # We'll calculate Gold vs Silver Regression
        X_corr = g_prices.reshape(-1, 1)
        y_corr = s_prices.reshape(-1, 1)
        model_gs = LinearRegression()
        model_gs.fit(X_corr, y_corr)
        slope_gs = float(model_gs.coef_[0][0])
        intercept_gs = float(model_gs.intercept_[0])
        
        # 2. Correlation
        r = float(np.corrcoef(g_prices, s_prices)[0, 1])
        
        # 3. Time-series formatting for the frontend chart
        g_base = g_prices[0]
        s_base = s_prices[0]
        
        timeseries_data = []
        for i in range(len_min):
            timeseries_data.append({
                'date': dates[i].strftime('%Y-%m-%d'),
                'gold_price': float(g_prices[i]),
                'silver_price': float(s_prices[i]),
                'gold_return': float(((g_prices[i] - g_base) / g_base) * 100),
                'silver_return': float(((s_prices[i] - s_base) / s_base) * 100)
            })

        # Fetch absolute current spot price
        gold_spot = 0
        silver_spot = 0
        try:
            g_ticker = yf.Ticker(GOLD_TICKER)
            s_ticker = yf.Ticker(SILVER_TICKER)
            
            # Use fast_info if available, or last close from 1m history
            g_live = g_ticker.history(period='1d', interval='1m')
            s_live = s_ticker.history(period='1d', interval='1m')
            
            if not g_live.empty:
                gold_spot = float(g_live['Close'].iloc[-1]) * GOLD_MULTIPLIER
            else:
                gold_spot = float(g_prices[-1])
                
            if not s_live.empty:
                silver_spot = float(s_live['Close'].iloc[-1]) * SILVER_MULTIPLIER
            else:
                silver_spot = float(s_prices[-1])
        except Exception as e:
            logger.error(f"Error fetching spot prices: {str(e)}")
            gold_spot = float(g_prices[-1])
            silver_spot = float(s_prices[-1])

        return Response({
            'gold_ticker': GOLD_TICKER,
            'silver_ticker': SILVER_TICKER,
            'gold_spot_price': gold_spot,
            'silver_spot_price': silver_spot,
            'correlation': r,
            'regression': {
                'slope': slope_gs,
                'intercept': intercept_gs,
                'equation': f"Silver = {slope_gs:.4f} * Gold + {intercept_gs:.4f}"
            },
            'timeseries': timeseries_data
        })
    except Exception as e:
        logger.error(f"Error in gold/silver analysis: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
