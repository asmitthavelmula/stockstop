"""
PCA Analysis Service for Portfolio Visualization
Performs Principal Component Analysis on portfolio stocks
"""

import numpy as np
import logging
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from portfolios.services.stock_service import StockService
from portfolios.services.analysis_service import AnalysisService

logger = logging.getLogger(__name__)


class PCAService:
    """Service for PCA analysis of portfolio stocks"""
    
    @staticmethod
    def perform_pca(portfolio, n_components=2):
        """
        Perform PCA analysis on portfolio stocks
        
        Features used:
        - Current Price
        - P/E Ratio
        - Market Cap
        - Dividend Yield
        - Price Change (last 365 days)
        - Volume
        - Volatility
        
        Returns list of stocks with PCA coordinates and metadata
        """
        try:
            stocks = portfolio.stocks.all()
            if stocks.count() < 2:
                logger.warning(f"Portfolio {portfolio.id} has less than 2 stocks for PCA")
                return {'error': 'At least 2 stocks required for PCA', 'stocks': []}
            
            features = []
            stock_data = []
            
            # Collect features for each stock
            for stock in stocks:
                try:
                    company = stock.company
                    
                    # Fetch latest price
                    price_data = StockService.fetch_historical_data(company.symbol, past_days=365)
                    
                    if price_data is None or price_data.empty:
                        logger.warning(f"No price data for {company.symbol}")
                        continue
                    
                    # Calculate features
                    current_price = float(company.current_price or 0)
                    pe_ratio = float(company.pe_ratio or 0)
                    market_cap = float(company.market_cap or 0)
                    div_yield = float(company.dividend_yield or 0)
                    
                    # Price change percentage (365 days)
                    if len(price_data) > 1:
                        start_price = price_data['Close'].iloc[0]
                        end_price = price_data['Close'].iloc[-1]
                        price_change = ((end_price - start_price) / start_price * 100) if start_price > 0 else 0
                    else:
                        price_change = 0
                    
                    # Volume (average)
                    avg_volume = float(price_data['Volume'].mean()) if 'Volume' in price_data.columns else 0
                    
                    # Volatility (standard deviation of returns)
                    returns = price_data['Close'].pct_change().dropna()
                    volatility = float(returns.std() * np.sqrt(252)) if len(returns) > 0 else 0
                    
                    # Feature vector (normalize by removing extreme outliers)
                    feature_row = [
                        current_price,
                        max(0, pe_ratio),  # Avoid negative P/E
                        max(0, market_cap / 1e9) if market_cap else 0,  # Convert to billions
                        max(0, div_yield * 100),  # Convert to percentage
                        price_change,
                        avg_volume / 1e6 if avg_volume else 0,  # Convert to millions
                        volatility * 100,  # Convert to percentage
                    ]
                    
                    features.append(feature_row)
                    stock_data.append({
                        'stock_id': stock.id,
                        'symbol': company.symbol,
                        'name': company.name,
                        'current_price': current_price,
                        'pe_ratio': company.pe_ratio,
                        'sector': company.sector,
                    })
                
                except Exception as e:
                    logger.error(f"Error processing stock {stock.company.symbol}: {str(e)}")
                    continue
            
            if len(features) < 2:
                logger.warning(f"Portfolio {portfolio.id} has less than 2 valid stocks after filtering")
                return {'error': 'Not enough valid stocks for PCA', 'stocks': stock_data}
            
            # Convert to numpy array
            X = np.array(features)
            
            # Handle any NaN or Inf values
            X = np.nan_to_num(X, nan=0, posinf=0, neginf=0)
            
            # Standardize features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # Perform PCA
            pca = PCA(n_components=min(n_components, X_scaled.shape[1]))
            X_pca = pca.fit_transform(X_scaled)
            
            # Perform K-means clustering on PCA components
            kmeans = KMeans(n_clusters=min(5, len(X_pca)), random_state=42, n_init=10)
            clusters = kmeans.fit_predict(X_pca)
            
            # Prepare results
            results = []
            for i, (stock_info, pca_coords, cluster) in enumerate(zip(stock_data, X_pca, clusters)):
                results.append({
                    **stock_info,
                    'x': float(pca_coords[0]),
                    'y': float(pca_coords[1]) if len(pca_coords) > 1 else 0,
                    'cluster': int(cluster),
                    'original_features': {
                        'price': features[i][0],
                        'pe_ratio': features[i][1],
                        'market_cap': features[i][2],
                        'div_yield': features[i][3],
                        'price_change': features[i][4],
                        'avg_volume': features[i][5],
                        'volatility': features[i][6],
                    }
                })
            
            return {
                'success': True,
                'stocks': results,
                'explained_variance': [float(v) for v in pca.explained_variance_ratio_],
                'cumulative_variance': [float(v) for v in np.cumsum(pca.explained_variance_ratio_)],
                'n_components': pca.n_components_,
                'n_clusters': len(set(clusters)),
                'feature_names': [
                    'Current Price',
                    'P/E Ratio',
                    'Market Cap (B)',
                    'Div Yield %',
                    'Price Change %',
                    'Avg Volume (M)',
                    'Volatility %'
                ]
            }
        
        except Exception as e:
            logger.error(f"Error performing PCA: {str(e)}")
            return {'error': str(e), 'stocks': []}

    @staticmethod
    def perform_custom_pca_clustering(portfolio, selected_features, k):
        """
        Calculates user-requested features, applies KMeans(k), and reduces exactly to 2 PCA coordinates.
        Available features:
        - "P/E Ratio"
        - "Discount from 1Y High"
        - "1 Month Return"
        - "3 Month Return"
        - "6 Month Return"
        - "LTP / 1Y High Ratio"
        """
        try:
            stocks = portfolio.stocks.all()
            if stocks.count() < 2:
                return {'error': 'At least 2 valid stocks required for clustering.'}
            
            raw_data = [] # stores dictionary of computed features for each valid stock
            
            for stock in stocks:
                try:
                    company = stock.company
                    price_data = StockService.fetch_historical_data(company.symbol, past_days=365)
                    if price_data is None or len(price_data) < 130: # Ensure we have at least 6 months ~126 trading days
                        continue
                    
                    price_data = price_data.sort_index(ascending=True) # Ensure chronological
                    current_price = float(price_data['Close'].iloc[-1])
                    high_1y = float(price_data['High'].max())
                    
                    # Compute Returns
                    def safe_return(offset):
                        if len(price_data) > offset:
                            past_price = float(price_data['Close'].iloc[-(offset+1)])
                            return ((current_price - past_price) / past_price) * 100 if past_price > 0 else 0
                        return 0

                    ret_1m = safe_return(21)
                    ret_3m = safe_return(63)
                    ret_6m = safe_return(126)
                    
                    discount_1y = ((high_1y - current_price) / high_1y * 100) if high_1y > 0 else 0
                    ltp_high_ratio = (current_price / high_1y) if high_1y > 0 else 0
                    pe_ratio = float(company.pe_ratio or 0)
                    
                    feature_dict = {
                        "P/E Ratio": float(pe_ratio),
                        "Discount from 1Y High": float(discount_1y),
                        "1 Month Return": float(ret_1m),
                        "3 Month Return": float(ret_3m),
                        "6 Month Return": float(ret_6m),
                        "LTP / 1Y High Ratio": float(ltp_high_ratio),
                    }
                    
                    raw_data.append({
                        'stock_id': stock.id,
                        'symbol': company.symbol,
                        'name': company.name,
                        'features': feature_dict
                    })
                except Exception as e:
                    logger.error(f"Error computing custom features for {stock.company.symbol}: {e}")
                    pass
            
            if len(raw_data) < 2:
                return {'error': 'Not enough historical data to compute 6-month returns across portfolio.'}

            # Filter out non-selected features for clustering matrix
            X = []
            for item in raw_data:
                row = []
                for feat in selected_features:
                    row.append(item['features'].get(feat, 0.0))
                X.append(row)
            
            X = np.array(X)
            X = np.nan_to_num(X, nan=0, posinf=0, neginf=0)
            
            if X.shape[1] == 0:
                return {'error': 'No valid features selected to cluster on.'}
                
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # 1. Apply KMeans Clustering
            actual_k = min(int(k), len(raw_data))
            kmeans = KMeans(n_clusters=actual_k, random_state=42, n_init=10)
            labels = kmeans.fit_predict(X_scaled)
            
            # 2. PCA Down to 2 Components for visualization
            pca = PCA(n_components=min(2, X_scaled.shape[1]))
            X_pca = pca.fit_transform(X_scaled)
            
            # Pad with 0 for Y axis if PCA only yielded 1 component
            while X_pca.shape[1] < 2:
                X_pca = np.hstack((X_pca, np.zeros((X_pca.shape[0], 1))))
                
            results = []
            for i, item in enumerate(raw_data):
                results.append({
                    'symbol': item['symbol'],
                    'name': item['name'],
                    'cluster': int(labels[i]),
                    'pca_x': float(X_pca[i, 0]),
                    'pca_y': float(X_pca[i, 1]),
                })
                
            return {
                'success': True,
                'k': actual_k,
                'total_stocks': len(results),
                'points': results,
            }
            
        except Exception as e:
            logger.error(f"Error in custom PCA clustering: {e}")
            return {'error': str(e)}
