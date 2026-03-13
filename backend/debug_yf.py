import os
import django
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from portfolios.services.stock_service import StockService
import yfinance as yf

try:
    print("Testing yfinance for GABRIEL.NS...")
    
    # Radical monkey-patching to disable cache
    import yfinance.cache as yfc
    yfc.db.connect = lambda *args, **kwargs: None
    yfc.Cache.lookup = lambda *args, **kwargs: None
    yfc.Cache.store = lambda *args, **kwargs: None
    yfc.Cache.initialise = lambda *args, **kwargs: None
    
    ticker = yf.Ticker('GABRIEL.NS')
    data = ticker.history(period='180d')
    print("Data fetched successfully!")
    print(data.tail())
except Exception as e:
    print("Error during yfinance test:")
    traceback.print_exc()
