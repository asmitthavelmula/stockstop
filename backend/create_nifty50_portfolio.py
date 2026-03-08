"""
Script to create Nift50 portfolio with top 50 Nifty stocks and live data.
Run from backend directory: python manage.py shell < create_nifty50_portfolio.py
"""

from portfolios.models import Portfolio, Company, Stock
from portfolios.services.stock_service import StockService
from datetime import date
import random

# Top 50 Nifty stocks (NSE symbols with .NS suffix)
NIFTY_50_STOCKS = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
    'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'MARUTI.NS', 'BAJAJFINSV.NS',
    'LANDT.NS', 'AXISBANK.NS', 'NESTLEIND.NS', 'ULTRACEMCO.NS', 'ASIANPAINT.NS',
    'DMARUTI.NS', 'TATASTEEL.NS', 'TATAMOTORS.NS', 'TITAN.NS', 'SUNPHARMA.NS',
    'WIPRO.NS', 'POWERGRID.NS', 'GAIL.NS', 'ONGC.NS', 'BAJAJ-AUTO.NS',
    'NTPC.NS', 'SBILIFE.NS', 'HCLTECH.NS', 'ADANIPORTS.NS', 'ADANIGREEN.NS',
    'COALINDIA.NS', 'JSWSTEEL.NS', 'HINDALCO.NS', 'INDUSIND.NS', 'TECHM.NS',
    'EICHERMOT.NS', 'HDFC.NS', 'APOLLOHOSP.NS', 'GODREJCP.NS', 'SIEMENS.NS',
    'HEROMOTOCO.NS', 'L&TFH.NS', 'ITC.NS', 'SHREECEM.NS', 'TATACONSUM.NS',
    'BPCL.NS', 'M&M.NS', 'BHARATPE.NS', 'BANDHANBNK.NS', 'DRREDDY.NS',
]

def create_nifty50_portfolio():
    """Create or update Nift50 portfolio with latest stock prices"""
    
    # Get or create portfolio
    portfolio, created = Portfolio.objects.get_or_create(
        name='Nift50',
        defaults={'description': 'Top 50 Nifty Stocks - Live Data Portfolio'}
    )
    
    if created:
        print(f'✓ Created new portfolio: {portfolio.name} (id={portfolio.id})')
    else:
        print(f'✓ Using existing portfolio: {portfolio.name} (id={portfolio.id})')
    
    added_count = 0
    failed_count = 0
    
    for symbol in NIFTY_50_STOCKS:
        try:
            print(f'  Processing {symbol}...', end=' ', flush=True)
            
            # Fetch live company data
            company_data = StockService.fetch_company_data(symbol)
            if not company_data:
                print(f'✗ (no data)')
                failed_count += 1
                continue
            
            # Create or update company
            company, _ = Company.objects.get_or_create(
                symbol=symbol,
                defaults={
                    'name': company_data.get('name', symbol),
                    'sector': company_data.get('sector') or 'Unknown',
                    'current_price': company_data.get('current_price') or 0,
                    'market_cap': company_data.get('market_cap'),
                    'pe_ratio': company_data.get('pe_ratio'),
                    'dividend_yield': company_data.get('dividend_yield'),
                }
            )
            
            # Update with latest data
            company.current_price = company_data.get('current_price') or company.current_price
            company.pe_ratio = company_data.get('pe_ratio') or company.pe_ratio
            company.dividend_yield = company_data.get('dividend_yield') or company.dividend_yield
            company.save()
            
            # Create stock entry if it doesn't exist
            if not Stock.objects.filter(portfolio=portfolio, company=company).exists():
                qty = random.randint(1, 5)
                purchase_price = float(company.current_price or 0) * (0.85 + random.random() * 0.3)
                
                stock = Stock.objects.create(
                    portfolio=portfolio,
                    company=company,
                    quantity=qty,
                    purchase_price=purchase_price,
                    purchase_date=date.today()
                )
                print(f'✓ (₹{company.current_price})')
                added_count += 1
            else:
                print(f'✓ (already exists)')
        
        except Exception as e:
            print(f'✗ ({str(e)[:50]})')
            failed_count += 1
    
    print(f'\n✓ Portfolio complete: {added_count} stocks added, {failed_count} failed')
    print(f'✓ Total stocks in portfolio: {portfolio.stocks.count()}')
    return portfolio

if __name__ == '__main__':
    create_nifty50_portfolio()
