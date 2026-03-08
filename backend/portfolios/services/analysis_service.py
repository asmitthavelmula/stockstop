import pandas as pd
from datetime import datetime, timedelta
from decimal import Decimal
from portfolios.models import StockAnalysis, HistoricalPrice
from portfolios.services.stock_service import StockService
import logging

logger = logging.getLogger(__name__)


class AnalysisService:
    """Service for analyzing stock data"""
    
    @staticmethod
    def analyze_stock(stock, past_days=365):
        """Perform comprehensive stock analysis"""
        try:
            company = stock.company
            
            # Fetch and store historical data
            StockService.store_historical_data(company, past_days)
            
            # Get historical prices
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=past_days)
            
            prices = HistoricalPrice.objects.filter(
                company=company,
                date__gte=start_date,
                date__lte=end_date
            ).values_list('close_price', flat=True).order_by('date')
            
            if len(prices) == 0:
                logger.warning(f"No historical data for {company.symbol}")
                return None
            
            prices_list = [float(p) for p in prices]
            
            # Calculate PE Ratio metrics
            pe_data = AnalysisService._calculate_pe_metrics(company, prices_list)
            
            # Calculate discount and opportunity
            current_price = float(company.current_price)
            fair_value = AnalysisService._calculate_fair_value(company, prices_list)
            discount = AnalysisService._calculate_discount(current_price, fair_value)
            opportunity_score = AnalysisService._calculate_opportunity_score(
                stock, current_price, fair_value, discount
            )
            
            # Determine recommendation
            recommendation = AnalysisService._get_recommendation(
                discount, opportunity_score, company.pe_ratio
            )
            
            # Create or update analysis record
            analysis = StockAnalysis.objects.create(
                stock=stock,
                past_days=past_days,
                pe_ratio_current=company.pe_ratio,
                pe_ratio_average=pe_data['average'],
                pe_ratio_min=pe_data['min'],
                pe_ratio_max=pe_data['max'],
                discount_percentage=discount,
                opportunity_score=opportunity_score,
                current_price=Decimal(str(current_price)),
                fair_value=Decimal(str(fair_value)),
                recommendation=recommendation
            )
            
            return analysis
        
        except Exception as e:
            logger.error(f"Error analyzing stock {stock.company.symbol}: {str(e)}")
            return None

    @staticmethod
    def analyze_stock_live(stock, past_days=365):
        """Perform analysis using live data without saving"""
        try:
            company = stock.company
            updated = StockService.update_company_price(company.symbol) or company
            current_price = float(updated.current_price)
            data = StockService.fetch_historical_data(company.symbol, past_days)
            if data is None or data.empty:
                return None
            prices_list = [float(x) for x in list(data['Close'].values)]
            if not prices_list:
                return None
            pe_data = AnalysisService._calculate_pe_metrics(updated, prices_list)
            fair_value = AnalysisService._calculate_fair_value(updated, prices_list)
            discount = AnalysisService._calculate_discount(current_price, fair_value)
            opportunity = AnalysisService._calculate_opportunity_score(stock, current_price, fair_value, discount)
            rec = AnalysisService._get_recommendation(discount, opportunity, updated.pe_ratio)
            return {
                'id': None,
                'company': {
                    'id': updated.id,
                    'symbol': updated.symbol,
                    'name': updated.name,
                    'sector': updated.sector,
                    'current_price': str(updated.current_price),
                    'market_cap': updated.market_cap,
                    'pe_ratio': updated.pe_ratio,
                    'dividend_yield': updated.dividend_yield,
                },
                'analysis_date': datetime.now().isoformat(),
                'past_days': past_days,
                'pe_ratio_current': updated.pe_ratio or 0,
                'pe_ratio_average': pe_data['average'],
                'pe_ratio_min': pe_data['min'],
                'pe_ratio_max': pe_data['max'],
                'discount_percentage': discount,
                'opportunity_score': opportunity,
                'current_price': str(current_price),
                'fair_value': str(fair_value),
                'recommendation': rec,
            }
        except Exception as e:
            logger.error(f"Error (live) analyzing stock {stock.company.symbol}: {str(e)}")
            return None
    
    @staticmethod
    def _calculate_pe_metrics(company, prices_list):
        """Calculate PE ratio metrics"""
        try:
            # Use current PE ratio if available
            current_pe = company.pe_ratio or 0
            
            # Simulate historical PE ratios based on price variations
            # In real scenario, you'd fetch historical PE data
            pe_values = [current_pe * (price / prices_list[-1]) for price in prices_list]
            
            return {
                'average': sum(pe_values) / len(pe_values) if pe_values else 0,
                'min': min(pe_values) if pe_values else 0,
                'max': max(pe_values) if pe_values else 0,
            }
        except Exception as e:
            logger.error(f"Error calculating PE metrics: {str(e)}")
            return {'average': 0, 'min': 0, 'max': 0}
    
    @staticmethod
    def _calculate_fair_value(company, prices_list):
        """Calculate fair value based on historical data"""
        try:
            # Use multiple valuation methods
            avg_price = sum(prices_list) / len(prices_list) if prices_list else 0
            
            # Price-to-Book, PEG ratio approach
            if company.pe_ratio and company.pe_ratio > 0:
                # Fair value using P/E  ratio
                # EPS = Current_Price / PE_Ratio
                # Fair Value = EPS * Industry_Avg_PE (using 15 as default)
                eps = float(company.current_price) / company.pe_ratio
                fair_value = eps * 15
            else:
                fair_value = avg_price
            
            return fair_value
        except Exception as e:
            logger.error(f"Error calculating fair value: {str(e)}")
            return sum(prices_list) / len(prices_list) if prices_list else 0
    
    @staticmethod
    def _calculate_discount(current_price, fair_value):
        """Calculate discount percentage"""
        if fair_value <= 0:
            return 0
        return ((fair_value - current_price) / fair_value) * 100
    
    @staticmethod
    def _calculate_opportunity_score(stock, current_price, fair_value, discount):
        """Calculate opportunity score (0-100)"""
        try:
            # Factor 1: Discount (higher discount = higher score)
            discount_score = min(discount, 50) / 50 * 30  # 0-30 points
            
            # Factor 2: Price below purchase price (positive factor)
            purchase_value = float(stock.purchase_price)
            if purchase_value > 0:
                price_factor = (purchase_value - current_price) / purchase_value
                price_score = max(price_factor * 50, 0)  # 0-50 points
            else:
                price_score = 0
            
            # Factor 3: Volatility (lower is better)
            volatility_score = 20  # Default 20 points
            
            opportunity = discount_score + min(price_score, 30) + volatility_score
            
            return max(min(opportunity, 100), 0)
        
        except Exception as e:
            logger.error(f"Error calculating opportunity score: {str(e)}")
            return 50
    
    @staticmethod
    def _get_recommendation(discount, opportunity_score, pe_ratio):
        """Get buy/sell recommendation"""
        if discount > 30 and opportunity_score > 70:
            return 'STRONG_BUY'
        elif discount > 20 and opportunity_score > 60:
            return 'BUY'
        elif discount > 10 and opportunity_score > 50:
            return 'HOLD'
        elif discount < -10:
            return 'SELL'
        else:
            return 'HOLD'
    
    @staticmethod
    def get_price_history_for_chart(stock, past_days=365):
        """Get price history formatted for charts"""
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=past_days)
            
            prices = HistoricalPrice.objects.filter(
                company=stock.company,
                date__gte=start_date,
                date__lte=end_date
            ).order_by('date').values('date', 'close_price')
            
            return [
                {
                    'date': str(p['date']),
                    'price': float(p['close_price'])
                }
                for p in prices
            ]
        except Exception as e:
            logger.error(f"Error fetching price history: {str(e)}")
            return []
