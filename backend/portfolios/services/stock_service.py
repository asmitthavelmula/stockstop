# Disable yfinance caching to avoid "unable to open database file" errors
# on some systems or in concurrent environments.
import os
import tempfile

# Set cache dir BEFORE importing yfinance
# Use a location that is guaranteed to be writable and not concurrent
cache_dir = os.path.join(tempfile.gettempdir(), f'yf_cache_{os.getpid()}')
os.environ['YF_CACHE_DIR'] = cache_dir
if not os.path.exists(cache_dir):
    try:
        os.makedirs(cache_dir)
    except:
        pass

import yfinance as yf

# Completely disable yfinance caching if possible
try:
    import yfinance.cache as yfc
    # Use a temporary directory for cache instead of None to avoid path errors
    yfc.set_cache_location(cache_dir)
    yfc.set_tz_cache_location(cache_dir)
except (ImportError, AttributeError, Exception):
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
        """Update current price for a company with fresh data"""
        try:
            # Force fresh ticker object
            ticker = yf.Ticker(symbol)
            # Use fast_info or latest 1m data for truly live feel
            data = ticker.history(period='1d', interval='1m')
            
            current_price = None
            if not data.empty:
                current_price = Decimal(str(data['Close'].iloc[-1]))
            else:
                # Fallback to 1d Close if 1m is unavailable (market closed)
                data_day = ticker.history(period='1d')
                if not data_day.empty:
                    current_price = Decimal(str(data_day['Close'].iloc[-1]))

            if current_price:
                try:
                    company, created = Company.objects.get_or_create(symbol=symbol)
                    company.current_price = current_price
                    # Also try to refresh basic metadata if it was missing
                    if created or not company.name:
                        info = ticker.info
                        company.name = info.get('longName', symbol)
                        company.sector = info.get('sector', '')
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
