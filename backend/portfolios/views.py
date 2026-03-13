import base64
import io
import logging
from datetime import datetime, timedelta

import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from .models import Portfolio, Stock, Company, StockAnalysis, HistoricalPrice
from .serializers import (
    PortfolioListSerializer, PortfolioDetailSerializer,
    StockListSerializer, StockDetailSerializer, StockCreateUpdateSerializer,
    CompanySerializer, StockAnalysisSerializer
)
from .services.stock_service import StockService
from .services.analysis_service import AnalysisService
from .services.clustering_service import ClusteringService
from .services.pca_service import PCAService
from .services.regression_service import RegressionService

logger = logging.getLogger(__name__)

ASSET_FORECAST_MAP = {
    'BTC-USD': {'ticker': 'BTC-USD', 'label': 'Bitcoin'},
    'Gold': {'ticker': 'GC=F', 'label': 'Gold'},
    'Silver': {'ticker': 'SI=F', 'label': 'Silver'},
}


class PortfolioViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Portfolio management
    """
    permission_classes = [AllowAny]
    queryset = Portfolio.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PortfolioDetailSerializer
        return PortfolioListSerializer
    
    def retrieve(self, request, *args, **kwargs):
        """
        Return portfolio details.
        Optional query param `refresh_prices=true` can be used to force a live refresh.
        """
        instance = self.get_object()
        refresh_prices = str(request.query_params.get('refresh_prices', '')).lower() in {'1', 'true', 'yes'}

        if refresh_prices:
            for stock in instance.stocks.all():
                try:
                    StockService.update_company_price(stock.company.symbol)
                except Exception:
                    pass

        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_stock(self, request, pk=None):
        """Add a stock to portfolio"""
        portfolio = self.get_object()
        
        symbol = request.data.get('symbol')
        quantity = request.data.get('quantity')
        purchase_price = request.data.get('purchase_price')
        purchase_date = request.data.get('purchase_date')
        
        # previously we used a truthiness check which rejected zero values
        # (e.g. purchase_price=0). instead explicitly ensure required fields
        # are provided (not None) so that 0 is accepted.
        if symbol is None or quantity is None or purchase_price is None or purchase_date is None:
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get or create company
            company = Company.objects.filter(symbol=symbol).first()
            if not company:
                company_data = StockService.fetch_company_data(symbol)
                if not company_data:
                    return Response(
                        {'error': f'Company {symbol} not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                company = Company.objects.create(**company_data)
            
            # Update company price if needed
            StockService.update_company_price(symbol)
            
            # Pre-fetch historical data for growth chart
            StockService.store_historical_data(company, past_days=30)
            company.refresh_from_db()
            
            # Create or update stock
            stock, created = Stock.objects.update_or_create(
                portfolio=portfolio,
                company=company,
                defaults={
                    'quantity': quantity,
                    'purchase_price': purchase_price,
                    'purchase_date': purchase_date,
                }
            )
            
            serializer = StockDetailSerializer(stock)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Error adding stock: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def create_portfolio(self, request):
        """Create a new portfolio"""
        name = request.data.get('name')
        description = request.data.get('description', '')
        
        if not name:
            return Response(
                {'error': 'Portfolio name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            portfolio = Portfolio.objects.create(name=name, description=description)
            serializer = PortfolioDetailSerializer(portfolio)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error creating portfolio: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def clustering(self, request, pk=None):
        """Perform clustering analysis on portfolio stocks"""
        portfolio = self.get_object()
        
        try:
            results = ClusteringService.perform_clustering(portfolio)
            return Response(results)
        except Exception as e:
            logger.error(f"Error performing clustering: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def analyze_all(self, request, pk=None):
        portfolio = self.get_object()
        past_days = request.data.get('past_days', 365)
        results = []
        try:
            for stock in portfolio.stocks.all():
                analysis = AnalysisService.analyze_stock(stock, past_days)
                if analysis:
                    results.append(StockAnalysisSerializer(analysis).data)
            if not results:
                return Response({'error': 'No analysis completed'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'analyses': results}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error analyzing portfolio stocks: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def analyze_all_live(self, request, pk=None):
        """Analyze all stocks using live data without saving results"""
        portfolio = self.get_object()
        past_days = request.data.get('past_days', 365)
        results = []
        try:
            for stock in portfolio.stocks.all():
                analysis = AnalysisService.analyze_stock_live(stock, past_days)
                if analysis:
                    results.append(analysis)
            if not results:
                return Response({'error': 'No analysis completed'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'analyses': results}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error live-analyzing portfolio stocks: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def refresh_prices(self, request, pk=None):
        """Refresh live stock prices for all stocks in the portfolio"""
        portfolio = self.get_object()
        updated_stocks = []
        failed_stocks = []
        
        try:
            for stock in portfolio.stocks.all():
                try:
                    StockService.update_company_price(stock.company.symbol)
                    stock.company.refresh_from_db()
                    updated_stocks.append({
                        'symbol': stock.company.symbol,
                        'name': stock.company.name,
                        'price': float(stock.company.current_price or 0),
                    })
                except Exception as e:
                    logger.error(f"Error updating {stock.company.symbol}: {str(e)}")
                    failed_stocks.append(stock.company.symbol)
            
            serializer = PortfolioDetailSerializer(portfolio)
            return Response({
                'portfolio': serializer.data,
                'updated': updated_stocks,
                'failed': failed_stocks,
                'timestamp': __import__('datetime').datetime.now().isoformat(),
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error refreshing portfolio prices: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def growth_data(self, request, pk=None):
        """Return portfolio growth data (total value over time)"""
        portfolio = self.get_object()
        days = int(request.query_params.get('days', 30))
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get all dates in range
        date_list = [start_date + timedelta(days=x) for x in range((end_date - start_date).days + 1)]
        
        # Initialize data for each stock to track its last known price
        stocks = portfolio.stocks.all()
        stock_values_over_time = {stock.id: {d.strftime('%Y-%m-%d'): 0.0 for d in date_list} for stock in stocks}
        
        for stock in stocks:
            historical_prices = HistoricalPrice.objects.filter(
                company=stock.company,
                date__gte=start_date - timedelta(days=7), # Look back a bit further to get initial price
                date__lte=end_date
            ).order_by('date')
            
            last_price = 0.0
            # Pre-fill with last known price before start_date if available
            initial_price_hp = historical_prices.filter(date__lt=start_date).last()
            if initial_price_hp:
                last_price = float(initial_price_hp.close_price)
            
            hp_map = {hp.date.strftime('%Y-%m-%d'): float(hp.close_price) for hp in historical_prices}
            
            for d in date_list:
                date_str = d.strftime('%Y-%m-%d')
                if date_str in hp_map:
                    last_price = hp_map[date_str]
                stock_values_over_time[stock.id][date_str] = last_price * stock.quantity
        
        # Aggregate values for all stocks
        sorted_dates = [d.strftime('%Y-%m-%d') for d in date_list]
        values = []
        for d_str in sorted_dates:
            day_total = sum(stock_values_over_time[stock.id][d_str] for stock in stocks)
            values.append(day_total)
        
        return Response({
            "dates": sorted_dates,
            "values": values
        })

    @action(detail=False, methods=['get'], url_path='portfolio-growth')
    def total_growth_data(self, request):
        """Return total portfolio growth data across all portfolios"""
        days = int(request.query_params.get('days', 30))
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)
        
        date_list = [start_date + timedelta(days=x) for x in range((end_date - start_date).days + 1)]
        
        stocks = Stock.objects.all()
        stock_values_over_time = {stock.id: {d.strftime('%Y-%m-%d'): 0.0 for d in date_list} for stock in stocks}
        
        for stock in stocks:
            historical_prices = HistoricalPrice.objects.filter(
                company=stock.company,
                date__gte=start_date - timedelta(days=7),
                date__lte=end_date
            ).order_by('date')
            
            last_price = 0.0
            initial_price_hp = historical_prices.filter(date__lt=start_date).last()
            if initial_price_hp:
                last_price = float(initial_price_hp.close_price)
                
            hp_map = {hp.date.strftime('%Y-%m-%d'): float(hp.close_price) for hp in historical_prices}
            
            for d in date_list:
                date_str = d.strftime('%Y-%m-%d')
                if date_str in hp_map:
                    last_price = hp_map[date_str]
                stock_values_over_time[stock.id][date_str] = last_price * stock.quantity
                
        sorted_dates = [d.strftime('%Y-%m-%d') for d in date_list]
        values = []
        for d_str in sorted_dates:
            day_total = sum(stock_values_over_time[stock.id][d_str] for stock in stocks)
            values.append(day_total)
        
        return Response({
            "dates": sorted_dates,
            "values": values
        })
    
    @action(detail=True, methods=['get'])
    def inr_summary(self, request, pk=None):
        """Return portfolio prices converted to INR using USDINR FX rate"""
        portfolio = self.get_object()
        try:
            rate = StockService.get_fx_rate('USDINR=X') or 83.0
            def is_in_inr(sym):
                return sym.endswith('.NS') or sym.endswith('.BO')
            stocks_data = []
            total_current_inr = 0.0
            total_invest_inr = 0.0
            for stock in portfolio.stocks.all():
                sym = stock.company.symbol
                qty = float(stock.quantity)
                cur_price = float(stock.company.current_price or 0)
                purchase_price = float(stock.purchase_price or 0)
                cur_inr = cur_price if is_in_inr(sym) else cur_price * rate
                purch_inr = purchase_price if is_in_inr(sym) else purchase_price * rate
                stocks_data.append({
                    'symbol': sym,
                    'name': stock.company.name,
                    'quantity': qty,
                    'current_price_inr': cur_inr,
                    'current_value_inr': qty * cur_inr,
                    'purchase_price_inr': purch_inr,
                })
                total_current_inr += qty * cur_inr
                total_invest_inr += qty * purch_inr
            gain_inr = total_current_inr - total_invest_inr
            gain_pct = 0 if total_invest_inr == 0 else (gain_inr / total_invest_inr) * 100
            return Response({
                'fx_rate_usd_inr': rate,
                'total_value_inr': total_current_inr,
                'total_investment_inr': total_invest_inr,
                'total_gain_loss_inr': gain_inr,
                'total_gain_loss_percentage': gain_pct,
                'stocks': stocks_data,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error building INR summary: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def pca_analysis(self, request, pk=None):
        """Perform PCA analysis on portfolio stocks for visualization"""
        portfolio = self.get_object()
        
        try:
            result = PCAService.perform_pca(portfolio, n_components=2)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error performing PCA analysis: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def run_pca_clustering(self, request, pk=None):
        """Perform custom PCA clustering based on selected features"""
        portfolio = self.get_object()
        features = request.data.get('features', [])
        k = request.data.get('k', 3)
        
        try:
            result = PCAService.perform_custom_pca_clustering(portfolio, selected_features=features, k=k)
            if 'error' in result:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error performing custom PCA clustering: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def regression_analysis(self, request, pk=None):
        """Perform linear regression analysis on portfolio stocks"""
        portfolio = self.get_object()
        past_days = request.query_params.get('past_days', 365)
        forecast_days = request.query_params.get('forecast_days', 30)
        
        try:
            past_days = int(past_days)
            forecast_days = int(forecast_days)
            result = RegressionService.perform_linear_regression(portfolio, past_days=past_days, forecast_days=forecast_days)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error performing regression analysis: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def asset_forecast(self, request, pk=None):
        """Forecast selected asset (BTC/Gold/Silver) using live yfinance data."""
        portfolio = self.get_object()
        asset = request.query_params.get('asset', 'BTC-USD')
        past_days = int(request.query_params.get('past_days', 180))
        forecast_days = int(request.query_params.get('forecast_days', 30))

        if asset not in ASSET_FORECAST_MAP:
            return Response(
                {'error': f'Unsupported asset: {asset}', 'available_assets': list(ASSET_FORECAST_MAP.keys())},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cfg = ASSET_FORECAST_MAP[asset]
        try:
            price_data = StockService.fetch_historical_data(cfg['ticker'], past_days=past_days)
            if price_data is None or price_data.empty or len(price_data) < 20:
                return Response(
                    {'error': f'Insufficient data for asset {asset}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            closes = price_data['Close'].astype(float).values
            dates = price_data.index
            n = len(closes)

            X = np.arange(n, dtype=float)
            y = closes.astype(float)

            x_mean = float(np.mean(X))
            x_std = float(np.std(X)) or 1.0
            X_scaled = (X - x_mean) / x_std
            degree = 2 if n >= 3 else 1
            coeffs = np.polyfit(X_scaled, y, degree)
            poly_model = np.poly1d(coeffs)
            y_fit = poly_model(X_scaled)

            historical = []
            for i, (date, price, fit) in enumerate(zip(dates, closes, y_fit)):
                historical.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'actual_price': float(price),
                    'trend_price': float(fit),
                    'idx': i,
                })

            recent_window = min(30, n - 1)
            if recent_window > 1:
                recent_slice = y[-(recent_window + 1):]
                recent_returns = np.diff(recent_slice) / np.clip(recent_slice[:-1], 1e-9, None)
            else:
                recent_returns = np.array([0.0])
            drift = float(np.mean(recent_returns)) if len(recent_returns) > 0 else 0.0
            ret_std = float(np.std(recent_returns)) if len(recent_returns) > 0 else 0.0
            centered_returns = recent_returns - drift if len(recent_returns) > 0 else np.array([0.0])

            future_X = np.arange(n, n + forecast_days, dtype=float)
            last_date = datetime.strptime(dates[-1].strftime('%Y-%m-%d'), '%Y-%m-%d')
            future = []
            prev_price = float(y[-1])
            for i, _x in enumerate(future_X, start=1):
                cyc = float(centered_returns[(i - 1) % len(centered_returns)]) if len(centered_returns) > 0 else 0.0
                decay = np.exp(-i / max(forecast_days * 2.0, 1))
                weekly = 0.15 * ret_std * np.sin((2 * np.pi * i) / 7.0)
                daily_ret = drift + (0.9 * cyc * decay) + weekly
                pred = max(prev_price * (1.0 + daily_ret), 0.0)
                prev_price = pred
                future.append({
                    'date': (last_date + timedelta(days=i)).strftime('%Y-%m-%d'),
                    'forecast_price': float(pred),
                    'idx': n + i - 1,
                })

            return Response({
                'portfolio_id': portfolio.id,
                'portfolio_name': portfolio.name,
                'asset': asset,
                'asset_label': cfg['label'],
                'ticker': cfg['ticker'],
                'past_days': past_days,
                'forecast_days': forecast_days,
                'historical_data': historical,
                'future_predictions': future,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error forecasting asset {asset} for portfolio {portfolio.id}: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PortfolioPCAKMeansPlotAPIView(APIView):
    """
    Generate PCA (2D) + KMeans scatter plot and return it as base64 PNG.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        portfolio = get_object_or_404(Portfolio, pk=pk)

        try:
            try:
                import matplotlib
                matplotlib.use('Agg')
                import matplotlib.pyplot as plt
            except Exception:
                return Response(
                    {'error': 'Plot generation dependency missing: install matplotlib in backend environment.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            stocks = portfolio.stocks.select_related('company').prefetch_related('analyses')
            feature_rows = []
            stock_labels = []
            stock_names = []
            stock_ids = []

            for stock in stocks:
                analysis = stock.analyses.first()
                company = stock.company
                current_price = float(company.current_price or 0)
                pe_ratio = float(company.pe_ratio or 0)

                # Discount from 53-week high formula:
                # ((53W High - Current Price) / 53W High) * 100
                discount = 0.0
                try:
                    hist = StockService.fetch_historical_data(company.symbol, past_days=371)
                    if hist is not None and not hist.empty:
                        if 'High' in hist.columns:
                            high_53w = float(hist['High'].max() or 0)
                        else:
                            high_53w = float(hist['Close'].max() or 0)
                        if high_53w > 0:
                            discount = ((high_53w - current_price) / high_53w) * 100.0
                except Exception:
                    discount = 0.0

                # Keep discount non-negative for "distance below 53W high".
                discount = max(0.0, float(discount))

                if analysis:
                    opportunity = float(analysis.opportunity_score or 0)
                    pe_for_feature = float(analysis.pe_ratio_current or pe_ratio)
                else:
                    opportunity = max(0.0, min(100.0, 50.0 + discount))
                    pe_for_feature = pe_ratio

                feature_rows.append([
                    pe_for_feature,
                    discount,
                    opportunity,
                    current_price,
                ])
                stock_labels.append(stock.company.symbol)
                stock_names.append(stock.company.name or stock.company.symbol)
                stock_ids.append(stock.id)

            if len(feature_rows) < 2:
                return Response(
                    {'error': 'At least 2 stocks are required to generate clustering plot.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            features = np.array(feature_rows, dtype=float)

            scaler = StandardScaler()
            scaled = scaler.fit_transform(features)

            pca = PCA(n_components=2)
            pca_points = pca.fit_transform(scaled)

            try:
                requested_k = int(request.query_params.get('k', 3))
            except (TypeError, ValueError):
                requested_k = 3
            n_clusters = max(2, min(requested_k, len(pca_points)))

            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            raw_labels = kmeans.fit_predict(pca_points)
            centers = kmeans.cluster_centers_
            cluster_palette = ['#1f77b4', '#d62728', '#2ca02c', '#9467bd', '#ff7f0e', '#17becf', '#8c564b']

            # Make cluster-color mapping deterministic for stable grouping visuals.
            # For k=3: highest PC2 -> green, right-most -> red, remaining -> blue.
            if n_clusters == 3:
                label_to_idx = {label: idx for idx, label in enumerate(np.unique(raw_labels))}
                idx_to_label = {idx: label for label, idx in label_to_idx.items()}

                top_idx = int(np.argmax(centers[:, 1]))
                remaining = [i for i in range(3) if i != top_idx]
                right_idx = int(remaining[np.argmax(centers[remaining, 0])])
                left_idx = int([i for i in range(3) if i not in {top_idx, right_idx}][0])

                remap = {
                    idx_to_label[left_idx]: 0,   # blue
                    idx_to_label[right_idx]: 1,  # red
                    idx_to_label[top_idx]: 2,    # green
                }
                cluster_labels = np.array([remap[int(lbl)] for lbl in raw_labels], dtype=int)
                cluster_colors = ['#1f77b4', '#d62728', '#2ca02c']
            else:
                cluster_labels = raw_labels
                cluster_colors = [cluster_palette[i % len(cluster_palette)] for i in range(n_clusters)]

            fig = None
            buffer = io.BytesIO()
            try:
                fig, ax = plt.subplots(figsize=(10, 6))
                if cluster_colors:
                    for label, color in enumerate(cluster_colors):
                        mask = cluster_labels == label
                        if np.any(mask):
                            ax.scatter(
                                pca_points[mask, 0],
                                pca_points[mask, 1],
                                s=80,
                                alpha=0.7,
                                facecolors='none',
                                edgecolors=color,
                                linewidths=1.2,
                                label=f'Cluster {label + 1}',
                            )
                    ax.legend(loc='best')
                    scatter = None
                ax.set_title(f'Portfolio {portfolio.id} - PCA + KMeans Clusters')
                ax.set_xlabel('PC1')
                ax.set_ylabel('PC2')
                ax.grid(True, linestyle=':', linewidth=0.8, alpha=0.8)

                for idx, symbol in enumerate(stock_labels):
                    ax.annotate(symbol, (pca_points[idx, 0], pca_points[idx, 1]), fontsize=8, alpha=0.8)

                if scatter is not None:
                    cbar = fig.colorbar(scatter, ax=ax)
                    cbar.set_label('Cluster')

                fig.tight_layout()
                fig.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
                buffer.seek(0)
                image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
            finally:
                buffer.close()
                if fig is not None:
                    plt.close(fig)

            return Response(
                {
                    'image_base64': image_base64,
                    'n_clusters': n_clusters,
                    'total_points': len(stock_labels),
                    'explained_variance_ratio': [float(v) for v in pca.explained_variance_ratio_],
                    'points': [
                        {
                            'symbol': stock_labels[i],
                            'name': stock_names[i],
                            'stock_id': stock_ids[i],
                            'cluster': int(cluster_labels[i]),
                            'cluster_color': cluster_colors[int(cluster_labels[i]) % len(cluster_colors)],
                            'pc1': float(pca_points[i, 0]),
                            'pc2': float(pca_points[i, 1]),
                            'pe_ratio': float(features[i, 0]),
                            'discount': float(features[i, 1]),
                            'opportunity': float(features[i, 2]),
                            'current_price': float(features[i, 3]),
                        }
                        for i in range(len(stock_labels))
                    ],
                    'cluster_options': [
                        {
                            'cluster': int(i),
                            'label': f'Cluster {int(i) + 1}',
                            'color': cluster_colors[int(i) % len(cluster_colors)],
                        }
                        for i in range(n_clusters)
                    ],
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.exception('Error generating PCA KMeans plot for portfolio %s', portfolio.id)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StockViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Stock management
    """
    permission_classes = [AllowAny]
    queryset = Stock.objects.all()
    serializer_class = StockDetailSerializer
    
    @action(detail=True, methods=['post'])
    def analyze(self, request, pk=None):
        """Analyze a stock"""
        stock = self.get_object()
        past_days = request.data.get('past_days', 365)
        
        try:
            analysis = AnalysisService.analyze_stock(stock, past_days)
            
            if not analysis:
                return Response(
                    {'error': 'Unable to analyze stock'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = StockAnalysisSerializer(analysis)
            return Response(serializer.data)
        
        except Exception as e:
            logger.error(f"Error analyzing stock: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def price_history(self, request, pk=None):
        """Get price history for chart"""
        stock = self.get_object()
        past_days = request.query_params.get('past_days', 365)
        
        try:
            past_days = int(past_days)
            price_data = AnalysisService.get_price_history_for_chart(stock, past_days)
            return Response({'prices': price_data})
        except Exception as e:
            logger.error(f"Error fetching price history: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def live_regression(self, request, pk=None):
        """Live time-series regression using fresh market data (time vs close price)."""
        stock = self.get_object()
        past_days = int(request.query_params.get('past_days', 180))
        forecast_days = int(request.query_params.get('forecast_days', 7))
        model_type = request.query_params.get('model', 'linear')

        try:
            price_data = StockService.fetch_historical_data(stock.company.symbol, past_days=past_days)
            if price_data is None or price_data.empty or len(price_data) < 10:
                return Response(
                    {'error': 'Insufficient live data for prediction'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            closes = price_data['Close'].astype(float).values
            dates = price_data.index
            n = len(closes)
            
            historical_dates = [d.strftime('%Y-%m-%d') for d in dates]
            historical_prices = [float(p) for p in closes]
            
            forecast_prices = []
            
            if model_type == 'linear':
                # Existing Polynomial/Linear Blend Logic
                X = np.arange(n).astype(float)
                y = closes.astype(float)
                degree = 2 if n >= 3 else 1
                coeffs = np.polyfit(X, y, degree)
                poly_model = np.poly1d(coeffs)
                
                returns = np.diff(closes) / closes[:-1]
                volatility = float(np.std(returns)) if len(returns) > 0 else 0.01
                drift = float(np.mean(returns)) if len(returns) > 0 else 0.0
                
                last_price = float(closes[-1])
                for i in range(1, forecast_days + 1):
                    trend_val = float(poly_model(n + i - 1))
                    simulated_ret = drift + np.random.normal(0, volatility)
                    path_val = last_price * (1.0 + simulated_ret)
                    blended_price = (trend_val * 0.7) + (path_val * 0.3)
                    blended_price = max(blended_price, 0.01)
                    forecast_prices.append(blended_price)
                    last_price = blended_price

            elif model_type == 'logistic':
                # Logistic Regression for price direction/classification-based prediction
                from sklearn.linear_model import LogisticRegression as SkLogisticRegression
                X = np.arange(n).reshape(-1, 1)
                # Binary target: 1 if price went up, 0 if down
                y_direction = (np.diff(closes, prepend=closes[0]) > 0).astype(int)
                log_model = SkLogisticRegression()
                log_model.fit(X, y_direction)
                
                last_price = float(closes[-1])
                avg_move = np.mean(np.abs(np.diff(closes)))
                for i in range(1, forecast_days + 1):
                    prob_up = log_model.predict_proba([[n + i - 1]])[0][1]
                    # Simple heuristic: move price based on probability of being "up" day
                    move = avg_move * (prob_up - 0.5) * 2
                    new_price = last_price + move
                    forecast_prices.append(max(new_price, 0.01))
                    last_price = new_price

            elif model_type == 'arima':
                # Basic Auto-Regressive approach (Simulated ARIMA behavior)
                # Real statsmodels ARIMA can be heavy, using AR-like logic
                p = 3
                if n > p:
                    returns = np.diff(closes) / closes[:-1]
                    last_price = float(closes[-1])
                    for i in range(1, forecast_days + 1):
                        # AR component: weight recent returns
                        ar_comp = 0.5 * returns[-1] + 0.3 * returns[-2] + 0.1 * returns[-3]
                        new_ret = ar_comp + np.random.normal(0, np.std(returns) * 0.5)
                        new_price = last_price * (1.0 + new_ret)
                        forecast_prices.append(max(new_price, 0.01))
                        last_price = new_price
                else:
                    forecast_prices = [float(closes[-1])] * forecast_days

            elif model_type == 'rnn':
                # Simulated RNN behavior (Sequence-based smoothing + momentum)
                window = 5
                last_price = float(closes[-1])
                momentum = (closes[-1] - closes[-window]) / window if n >= window else 0
                for i in range(1, forecast_days + 1):
                    # Decay momentum over time
                    current_momentum = momentum * np.exp(-i / 5)
                    noise = np.random.normal(0, last_price * 0.005)
                    new_price = last_price + current_momentum + noise
                    forecast_prices.append(max(new_price, 0.01))
                    last_price = new_price
            
            else:
                return Response({'error': f'Unsupported model type: {model_type}'}, status=status.HTTP_400_BAD_REQUEST)

            last_date = datetime.strptime(historical_dates[-1], '%Y-%m-%d')
            forecast_dates = [(last_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, forecast_days + 1)]

            return Response({
                "model_used": model_type,
                "historical_dates": historical_dates,
                "historical_prices": historical_prices,
                "forecast_dates": forecast_dates,
                "forecast_prices": forecast_prices
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in {model_type} prediction for {stock.company.symbol}: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def latest_analysis(self, request, pk=None):
        """Get latest analysis for a stock"""
        stock = self.get_object()
        
        try:
            analysis = stock.analyses.first()
            if not analysis:
                return Response(
                    {'error': 'No analysis available'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Prepare data for charts
            price_data = AnalysisService.get_price_history_for_chart(stock, analysis.past_days)
            
            serializer = StockAnalysisSerializer(analysis)
            response_data = serializer.data
            response_data['price_history'] = price_data
            
            return Response(response_data)
        
        except Exception as e:
            logger.error(f"Error fetching latest analysis: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def list(self, request, *args, **kwargs):
        """List stocks for a specific portfolio"""
        portfolio_id = request.query_params.get('portfolio_id')
        
        if portfolio_id:
            self.queryset = Stock.objects.filter(portfolio_id=portfolio_id)
        
        return super().list(request, *args, **kwargs)


class CompanyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Company data
    """
    permission_classes = [AllowAny]
    queryset = Company.objects.all()
    serializer_class = CompanySerializer

    @action(detail=False, methods=['get'])
    def live_price(self, request):
        """Fetch live price for any ticker using yfinance"""
        symbol = request.query_params.get('symbol')
        if not symbol:
            return Response({'error': 'Symbol is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            ticker = yf.Ticker(symbol)
            # Try history for latest close
            data = ticker.history(period='1d')
            if data.empty:
                # Try period='5d' just in case today is a holiday
                data = ticker.history(period='5d')
            
            if data.empty:
                return Response({'error': f'No data found for {symbol}'}, status=status.HTTP_404_NOT_FOUND)
            
            last_close = float(data['Close'].iloc[-1])
            prev_close = float(data['Open'].iloc[-1]) # Rough estimate of change if 1d
            if len(data) > 1:
                prev_close = float(data['Close'].iloc[-2])
            
            change = last_close - prev_close
            change_percent = (change / prev_close) * 100 if prev_close != 0 else 0
            
            return Response({
                'symbol': symbol,
                'price': last_close,
                'change': change,
                'change_percent': f"{change_percent:.2f}%",
                'last_updated': data.index[-1].strftime('%Y-%m-%d')
            })
        except Exception as e:
            logger.error(f"Error fetching live price for {symbol}: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for company by symbol"""
        symbol = request.query_params.get('symbol', '').upper()
        
        if not symbol or len(symbol) < 1:
            return Response(
                {'error': 'Symbol is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.filter(symbol=symbol).first()
            
            if not company:
                # Try to fetch from Yahoo Finance
                company_data = StockService.fetch_company_data(symbol)
                if not company_data:
                    return Response(
                        {'error': f'Company {symbol} not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                company = Company.objects.create(**company_data)
            else:
                # Update price if stale
                StockService.update_company_price(symbol)
                company.refresh_from_db()
            
            serializer = CompanySerializer(company)
            return Response(serializer.data)
        
        except Exception as e:
            logger.error(f"Error searching company: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
