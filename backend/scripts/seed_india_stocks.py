import os
import django
import sys
from datetime import date

# Set up Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from portfolios.models import Portfolio, Company, Stock
from portfolios.services.stock_service import StockService

def seed_stocks():
    # 1. Reliance Holding
    reliance_portfolio, _ = Portfolio.objects.get_or_create(
        name='Reliance Holding',
        defaults={'description': 'Stocks related to Reliance Industries and subsidiaries'}
    )
    
    reliance_symbols = [
        ('RELIANCE.NS', 'Reliance Industries'),
        ('JIOFIN.NS', 'Jio Financial Services'),
        ('NETWORK18.NS', 'Network18 Media')
    ]
    
    # 2. Tata Group
    tata_portfolio, _ = Portfolio.objects.get_or_create(
        name='Tata Group',
        defaults={'description': 'Premium Tata Group companies'}
    )
    
    tata_symbols = [
        ('TCS.NS', 'Tata Consultancy Services'),
        ('TATAMOTORS.NS', 'Tata Motors'),
        ('TATASTEEL.NS', 'Tata Steel'),
        ('TITAN.NS', 'Titan Company')
    ]
    
    all_groups = [
        (reliance_portfolio, reliance_symbols),
        (tata_portfolio, tata_symbols)
    ]
    
    for portfolio, symbols in all_groups:
        print(f"Seeding {portfolio.name}...")
        for symbol, name in symbols:
            try:
                # Use fetch_company_data to get real metrics
                c_data = StockService.fetch_company_data(symbol)
                company, created = Company.objects.update_or_create(
                    symbol=symbol,
                    defaults={
                        'name': c_data.get('name', name),
                        'sector': c_data.get('sector', 'Indian Stock'),
                        'current_price': c_data.get('current_price', 0),
                        'market_cap': c_data.get('market_cap', 0),
                        'pe_ratio': c_data.get('pe_ratio', 0),
                        'dividend_yield': c_data.get('dividend_yield', 0),
                    }
                )
                
                from decimal import Decimal
                Stock.objects.get_or_create(
                    portfolio=portfolio,
                    company=company,
                    defaults={
                        'quantity': 10,
                        'purchase_price': company.current_price * Decimal('0.9'), # 10% discount for demo "profit"
                        'purchase_date': date(2023, 1, 1)
                    }
                )
                print(f"  ✓ Added {symbol}")
            except Exception as e:
                print(f"  ✗ Failed to add {symbol}: {e}")

if __name__ == '__main__':
    seed_stocks()
    print("Seeding complete!")
