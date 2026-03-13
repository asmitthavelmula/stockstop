import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from portfolios.models import Company, Stock, HistoricalPrice
from portfolios.services.stock_service import StockService

def merge_tickers():
    wrong_symbol = 'INDUSIND.NS'
    correct_symbol = 'INDUSINDBK.NS'
    
    wrong_co = Company.objects.filter(symbol=wrong_symbol).first()
    correct_co, created = Company.objects.get_or_create(symbol=correct_symbol)
    
    if created or not correct_co.name or correct_co.name == correct_symbol:
        print(f"Initializing metadata for {correct_symbol}...")
        StockService.update_company_price(correct_symbol)
        StockService.store_historical_data(correct_co, past_days=730)
    
    if wrong_co:
        print(f"Found {wrong_symbol}. Moving stocks to {correct_symbol}...")
        stocks = Stock.objects.filter(company=wrong_co)
        for stock in stocks:
            print(f"Repointing Stock ID {stock.id} in Portfolio '{stock.portfolio.name}'")
            stock.company = correct_co
            stock.save()
        
        # Also move any historical prices if they somehow exist (though we know count is 0)
        HistoricalPrice.objects.filter(company=wrong_co).update(company=correct_co)
        
        print(f"Deleting invalid company {wrong_symbol}...")
        wrong_co.delete()
        print("Done.")
    else:
        print(f"{wrong_symbol} not found in database.")

if __name__ == "__main__":
    merge_tickers()
