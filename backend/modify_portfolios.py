import os
import django
import sys
from decimal import Decimal
from datetime import date

# Add the project root to sys.path
sys.path.append(os.getcwd())

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from portfolios.models import Portfolio, Company, Stock
from portfolios.services.stock_service import StockService

def modify_portfolios():
    # 1. Delete portfolios with IDs 7 and 9
    ids_to_delete = [7, 9]
    for p_id in ids_to_delete:
        try:
            p = Portfolio.objects.get(id=p_id)
            print(f"Deleting portfolio: {p.name} (ID: {p_id})")
            p.delete()
        except Portfolio.DoesNotExist:
            print(f"Portfolio with ID {p_id} does not exist.")

    # 2. Add more stocks to portfolio ID 1
    new_stocks_1 = ['HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS']
    try:
        p1 = Portfolio.objects.get(id=1)
        print(f"Adding stocks to: {p1.name} (ID: 1)")
        for symbol in new_stocks_1:
            # Update price from yfinance
            company = StockService.update_company_price(symbol)
            if company:
                # Add historical data
                StockService.store_historical_data(company, past_days=30)
                # Create Stock entry
                Stock.objects.get_or_create(
                    portfolio=p1,
                    company=company,
                    defaults={
                        'quantity': 10,
                        'purchase_price': company.current_price,
                        'purchase_date': date.today()
                    }
                )
                print(f"Added {symbol} to {p1.name}")
    except Portfolio.DoesNotExist:
        print("Portfolio with ID 1 does not exist.")

    # 3. Add more stocks to portfolio ID 2
    new_stocks_2 = ['TATAPOWER.NS', 'TATASTEEL.NS', 'TATACHEM.NS', 'TATACONSUM.NS']
    try:
        p2 = Portfolio.objects.get(id=2)
        print(f"Adding stocks to: {p2.name} (ID: 2)")
        for symbol in new_stocks_2:
            # Update price from yfinance
            company = StockService.update_company_price(symbol)
            if company:
                # Add historical data
                StockService.store_historical_data(company, past_days=30)
                # Create Stock entry
                Stock.objects.get_or_create(
                    portfolio=p2,
                    company=company,
                    defaults={
                        'quantity': 10,
                        'purchase_price': company.current_price,
                        'purchase_date': date.today()
                    }
                )
                print(f"Added {symbol} to {p2.name}")
    except Portfolio.DoesNotExist:
        print("Portfolio with ID 2 does not exist.")

if __name__ == "__main__":
    modify_portfolios()
