import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from portfolios.models import Company, HistoricalPrice
from portfolios.services.stock_service import StockService

def fix_data():
    companies = Company.objects.all()
    print(f"Checking {companies.count()} companies for missing historical data...")
    
    for company in companies:
        count = HistoricalPrice.objects.filter(company=company).count()
        if count < 2:
            print(f"Fixing {company.symbol} (current count: {count})...")
            # Fetch last 2 years to be safe for all types of analysis
            StockService.store_historical_data(company, past_days=730)
            new_count = HistoricalPrice.objects.filter(company=company).count()
            print(f"Updated {company.symbol}. New count: {new_count}")
        else:
            # Optionally refresh data if it's too old, but focus on missing first
            pass

if __name__ == "__main__":
    fix_data()
