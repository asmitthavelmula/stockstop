# Disable yfinance caching to avoid "unable to open database file" errors
# on some systems or in concurrent environments.
import yfinance as yf
import os

# Completely disable yfinance caching by pointing it to a non-existent/in-memory path if possible,
# or simply setting it to None if the version supports it.
try:
    import yfinance.cache as yfc
    yfc.set_cache_dir(None)
except (ImportError, AttributeError):
    pass
import pandas as pd
from datetime import datetime, timedelta
from decimal import Decimal
from portfolios.models import Company, HistoricalPrice
import logging

logger = logging.getLogger(__name__)


class StockService:
    """Service for fetching and updating stock data"""
    
    @staticmethod
    def fetch_company_data(symbol):
        """Fetch company data from Yahoo Finance"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            return {
                'symbol': symbol,
                'name': info.get('longName', symbol),
                'sector': info.get('sector', ''),
                'current_price': Decimal(str(info.get('currentPrice', 0))),
                'market_cap': info.get('marketCap', None),
                'pe_ratio': info.get('trailingPE', None),
                'dividend_yield': info.get('dividendYield', None),
            }
        except Exception as e:
            logger.error(f"Error fetching company data for {symbol}: {str(e)}")
            return None
    
    @staticmethod
    def get_fx_rate(pair_symbol='USDINR=X'):
        """Fetch FX rate (e.g., USD to INR) from Yahoo Finance"""
        try:
            ticker = yf.Ticker(pair_symbol)
            data = ticker.history(period='1d')
            if data is not None and len(data) > 0:
                return float(data['Close'].iloc[-1])
        except Exception as e:
            logger.error(f"Error fetching FX rate {pair_symbol}: {str(e)}")
        return None

    @staticmethod
    def update_company_price(symbol):
        """Update current price for a company"""
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period='1d')
            if len(data) > 0:
                current_price = Decimal(str(data['Close'].iloc[-1]))
                # info = ticker.info # Avoid ticker.info as it causes issues
                
                try:
                    company, created = Company.objects.get_or_create(symbol=symbol)
                    company.current_price = current_price
                    # company.pe_ratio = info.get('trailingPE', None)
                    # company.dividend_yield = info.get('dividendYield', None)
                    # company.market_cap = info.get('marketCap', None)
                    company.save()
                    return company
                except Exception as db_err:
                    logger.error(f"Database error updating price for {symbol}: {str(db_err)}")
                    raise db_err
        except Exception as e:
            logger.error(f"Error updating price for {symbol}: {str(e)}")
        
        return None
    
    @staticmethod
    def fetch_historical_data(symbol, past_days=365):
        """Fetch historical price data"""
        try:
            ticker = yf.Ticker(symbol)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=past_days)
            
            data = ticker.history(start=start_date, end=end_date)
            
            return data
        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}: {str(e)}")
            return None
    
    @staticmethod
    def store_historical_data(company, past_days=365):
        """Store historical price data in database"""
        try:
            data = StockService.fetch_historical_data(company.symbol, past_days)
            
            if data is not None and not data.empty:
                for date, row in data.iterrows():
                    date_only = date.date()
                    HistoricalPrice.objects.update_or_create(
                        company=company,
                        date=date_only,
                        defaults={
                            'open_price': Decimal(str(row['Open'])),
                            'high_price': Decimal(str(row['High'])),
                            'low_price': Decimal(str(row['Low'])),
                            'close_price': Decimal(str(row['Close'])),
                            'volume': int(row['Volume']),
                        }
                    )
                logger.info(f"Successfully stored {len(data)} historical prices for {company.symbol}")
        except Exception as e:
            logger.error(f"Error storing historical data for {company.symbol}: {str(e)}")
