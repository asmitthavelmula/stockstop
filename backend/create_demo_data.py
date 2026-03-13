import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from portfolios.models import Portfolio, Company, Stock
from portfolios.services.stock_service import StockService
from portfolios.services.analysis_service import AnalysisService
from datetime import date
import random

DEMO = {
    'Tata Group': ['TCS.NS', 'TATAMOTORS.NS', 'TATASTEEL.NS'],
    'Banking Portfolio': ['HDFCBANK.NS', 'ICICIBANK.NS', 'JPM'],
    'Automobile Portfolio': ['MARUTI.NS', 'M&M.NS', 'TATAMOTORS.NS'],
    'Reliance Holdings': ['RELIANCE.NS', 'HINDUNILVR.NS']
}

def create_demo():
    for pname, symbols in DEMO.items():
        p, _ = Portfolio.objects.get_or_create(name=pname, defaults={'description': f'Demo portfolio: {pname}'})
        print(f'Portfolio: {p.name} (id={p.id})')
        for sym in symbols:
            try:
                data = StockService.fetch_company_data(sym)
                if not data:
                    print(f'  Skipping {sym}: no data')
                    continue

                company, created = Company.objects.get_or_create(symbol=sym, defaults={
                    'name': data.get('name', sym),
                    'sector': data.get('sector') or '',
                    'current_price': data.get('current_price') or 0,
                    'market_cap': data.get('market_cap'),
                    'pe_ratio': data.get('pe_ratio'),
                    'dividend_yield': data.get('dividend_yield'),
                })
                # update current price
                try:
                    company.current_price = data.get('current_price') or company.current_price
                    company.pe_ratio = data.get('pe_ratio') or company.pe_ratio
                    company.save()
                except Exception:
                    pass

                if not Stock.objects.filter(portfolio=p, company=company).exists():
                    qty = random.randint(1, 10)
                    purchase_price = float(company.current_price or 0) * (0.9 + random.random() * 0.2)
                    s = Stock.objects.create(
                        portfolio=p,
                        company=company,
                        quantity=qty,
                        purchase_price=purchase_price,
                        purchase_date=date.today()
                    )
                    print(f'  Added {company.symbol} x{qty} at {purchase_price:.2f}')
                    # run analysis
                    try:
                        AnalysisService.analyze_stock(s, past_days=365)
                        print(f'    Analyzed {company.symbol}')
                    except Exception as e:
                        print(f'    Analysis error for {company.symbol}: {e}')
                else:
                    print(f'  Stock {company.symbol} already in portfolio')
            except Exception as e:
                print(f'  Error processing {sym}: {e}')

if __name__ == '__main__':
    create_demo()
