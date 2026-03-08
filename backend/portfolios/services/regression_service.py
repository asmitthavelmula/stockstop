"""
Linear Regression Analysis Service for Stock Price Trends
Performs linear regression on historical price data
"""

import numpy as np
import logging
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from portfolios.services.stock_service import StockService

logger = logging.getLogger(__name__)


class RegressionService:
    """Service for linear regression analysis of stock prices"""
    
    @staticmethod
    def perform_linear_regression(portfolio, past_days=365, forecast_days=30):
        """
        Perform linear regression analysis on portfolio stocks
        
        Returns:
        - Historical price data with trend line
        - Linear regression coefficients
        - R-squared and trend strength
        - Price predictions for next N days
        - Confidence intervals
        """
        try:
            stocks = portfolio.stocks.all()
            if stocks.count() == 0:
                logger.warning(f"Portfolio {portfolio.id} has no stocks")
                return {'error': 'No stocks in portfolio', 'stocks': []}
            
            results = []
            
            for stock in stocks:
                try:
                    symbol = stock.company.symbol
                    
                    # Fetch historical data
                    price_data = StockService.fetch_historical_data(symbol, past_days=past_days)
                    
                    if price_data is None or price_data.empty or len(price_data) < 10:
                        logger.warning(f"Insufficient data for {symbol}")
                        continue
                    
                    # Extract closing prices
                    prices = price_data['Close'].values
                    dates = price_data.index
                    
                    # Create X (days) and y (prices)
                    X = np.arange(len(prices)).reshape(-1, 1)
                    y = prices.reshape(-1, 1)
                    
                    # Perform linear regression
                    model = LinearRegression()
                    model.fit(X, y)
                    
                    # Calculate metrics
                    y_pred = model.predict(X)
                    r2 = r2_score(y, y_pred)
                    slope = float(model.coef_[0][0])
                    intercept = float(model.intercept_[0])
                    
                    # Calculate residual standard error for confidence intervals
                    residuals = y - y_pred
                    rse = np.sqrt(np.sum(residuals**2) / (len(prices) - 2))
                    
                    # Historical data with trend
                    historical = []
                    for i, (date, price, trend) in enumerate(zip(dates, prices, y_pred.flatten())):
                        historical.append({
                            'date': date.strftime('%Y-%m-%d'),
                            'price': float(price),
                            'trend': float(trend),
                            'day': i,
                        })
                    
                    # Generate future predictions
                    future_X = np.arange(len(prices), len(prices) + forecast_days).reshape(-1, 1)
                    future_y_pred = model.predict(future_X)
                    
                    # Calculate prediction intervals (95% confidence)
                    t_val = 1.96  # 95% confidence level
                    se_pred = rse * np.sqrt(1 + 1/len(prices) + (future_X - X.mean())**2 / np.sum((X - X.mean())**2))
                    
                    future_data = []
                    end_date = datetime.strptime(dates[-1].strftime('%Y-%m-%d'), '%Y-%m-%d')
                    
                    for i, (pred, se) in enumerate(zip(future_y_pred.flatten(), se_pred.flatten())):
                        future_date = end_date + timedelta(days=i+1)
                        future_data.append({
                            'date': future_date.strftime('%Y-%m-%d'),
                            'predicted_price': float(pred),
                            'lower_bound': float(pred - t_val * se),
                            'upper_bound': float(pred + t_val * se),
                            'day': len(prices) + i,
                        })
                    
                    # Calculate trend description
                    daily_change = (prices[-1] - prices[0]) / len(prices)
                    annual_change = slope * 252  # Trading days in a year
                    
                    if abs(slope) < 0.01:
                        trend_desc = "Stable"
                    elif slope > 0:
                        trend_desc = f"Uptrend (+₹{annual_change:.2f}/year)"
                    else:
                        trend_desc = f"Downtrend (₹{annual_change:.2f}/year)"
                    
                    results.append({
                        'stock_id': stock.id,
                        'symbol': stock.company.symbol,
                        'name': stock.company.name,
                        'current_price': float(stock.company.current_price or 0),
                        'sector': stock.company.sector,
                        'regression': {
                            'slope': slope,
                            'intercept': intercept,
                            'r_squared': float(r2),
                            'trend_strength': "Strong" if abs(r2) > 0.7 else ("Moderate" if abs(r2) > 0.5 else "Weak"),
                            'trend_direction': "Uptrend" if slope > 0 else "Downtrend",
                            'trend_description': trend_desc,
                            'daily_change': float(daily_change),
                            'annual_change': float(annual_change),
                        },
                        'historical_data': historical,
                        'future_predictions': future_data,
                        'statistics': {
                            'min_price': float(np.min(prices)),
                            'max_price': float(np.max(prices)),
                            'avg_price': float(np.mean(prices)),
                            'std_dev': float(np.std(prices)),
                            'price_range': float(np.max(prices) - np.min(prices)),
                        }
                    })
                
                except Exception as e:
                    logger.error(f"Error analyzing stock {stock.company.symbol}: {str(e)}")
                    continue
            
            if len(results) == 0:
                return {'error': 'Could not analyze any stocks', 'stocks': []}
            
            return {
                'success': True,
                'stocks': results,
                'portfolio_name': portfolio.name,
                'analysis_date': datetime.now().isoformat(),
                'past_days': past_days,
                'forecast_days': forecast_days,
            }
        
        except Exception as e:
            logger.error(f"Error performing regression analysis: {str(e)}")
            return {'error': str(e), 'stocks': []}
