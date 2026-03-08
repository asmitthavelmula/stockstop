import numpy as np
from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
import logging

logger = logging.getLogger(__name__)


class ClusteringService:
    """Service for stock clustering analysis"""
    
    @staticmethod
    def get_clustering_features(stocks):
        """Extract features for clustering from stocks"""
        features = []
        stock_info = []
        
        for stock in stocks:
            # Get analysis if available
            analysis = stock.analyses.first()
            if not analysis:
                continue

            # Extract feature values for this stock
            pe = float(analysis.pe_ratio_current or 0)
            discount = float(analysis.discount_percentage or 0)
            opportunity = float(analysis.opportunity_score or 0)
            current_price = float(stock.company.current_price or 0)

            # Features: PE ratio, discount %, opportunity score, current price
            feature_vector = [pe, discount, opportunity, current_price]
            features.append(feature_vector)
            stock_info.append({
                'id': stock.id,
                'symbol': stock.company.symbol,
                'name': stock.company.name,
                'quantity': stock.quantity,
                'features': {
                    'pe_ratio_current': pe,
                    'discount_percentage': discount,
                    'opportunity_score': opportunity,
                    'current_price': current_price,
                }
            })
        
        if len(features) < 2:
            return None, None
        
        return np.array(features), stock_info
    
    @staticmethod
    def perform_clustering(portfolio):
        """Perform multiple clustering analyses on portfolio stocks"""
        try:
            stocks = portfolio.stocks.all()
            features, stock_info = ClusteringService.get_clustering_features(stocks)
            
            if features is None:
                return {
                    'error': 'Not enough analyzed stocks for clustering',
                    'min_required': 2
                }
            
            # Standardize features
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(features)
            
            results = {
                'stocks': stock_info,
                'feature_names': ['pe_ratio_current','discount_percentage','opportunity_score','current_price'],
                'feature_count': features.shape[1],
                'total_stocks': len(stock_info),
                'methods': {},
                'best_method': None,
                'best_score': -1,
            }
            
            # K-Means clustering (k=2 to 5)
            kmeans_results = []
            for k in range(2, min(6, len(stock_info) + 1)):
                try:
                    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
                    labels = kmeans.fit_predict(features_scaled)
                    score = silhouette_score(features_scaled, labels)
                    
                    kmeans_results.append({
                        'k': k,
                        'labels': labels.tolist(),
                        'score': float(score),
                        'centers': kmeans.cluster_centers_.tolist(),
                    })
                    # compute pairwise silhouette scores for feature pairs
                    pair_scores = {}
                    feat_names = results.get('feature_names') or ['f0','f1','f2','f3']
                    for i in range(features.shape[1]):
                        for j in range(i+1, features.shape[1]):
                            sub = features_scaled[:, [i, j]]
                            try:
                                ps = silhouette_score(sub, labels)
                                pair_key = f"{feat_names[i]}__{feat_names[j]}"
                                pair_scores[pair_key] = float(ps)
                            except Exception:
                                pass
                    kmeans_results[-1]['pairwise_scores'] = pair_scores
                    
                    if score > results['best_score']:
                        results['best_score'] = float(score)
                        results['best_method'] = f'KMeans (k={k})'
                except Exception as e:
                    logger.error(f"Error in KMeans k={k}: {str(e)}")
            
            results['methods']['kmeans'] = kmeans_results
            
            # Hierarchical Clustering
            try:
                hierarchical = AgglomerativeClustering(n_clusters=3)
                labels = hierarchical.fit_predict(features_scaled)
                score = silhouette_score(features_scaled, labels)
                
                results['methods']['hierarchical'] = {
                    'labels': labels.tolist(),
                    'score': float(score),
                    'n_clusters': 3,
                }
                # pairwise scores
                pair_scores = {}
                feat_names = results.get('feature_names') or ['f0','f1','f2','f3']
                for i in range(features.shape[1]):
                    for j in range(i+1, features.shape[1]):
                        sub = features_scaled[:, [i, j]]
                        try:
                            ps = silhouette_score(sub, labels)
                            pair_key = f"{feat_names[i]}__{feat_names[j]}"
                            pair_scores[pair_key] = float(ps)
                        except Exception:
                            pass
                results['methods']['hierarchical']['pairwise_scores'] = pair_scores
                
                if score > results['best_score']:
                    results['best_score'] = float(score)
                    results['best_method'] = 'Hierarchical (n=3)'
            except Exception as e:
                logger.error(f"Error in Hierarchical: {str(e)}")
                results['methods']['hierarchical'] = {'error': str(e)}
            
            # DBSCAN Clustering
            try:
                dbscan = DBSCAN(eps=0.5, min_samples=2)
                labels = dbscan.fit_predict(features_scaled)
                n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
                
                if n_clusters > 0 and n_clusters < len(stock_info):
                    score = silhouette_score(features_scaled, labels[labels != -1])
                    results['methods']['dbscan'] = {
                        'labels': labels.tolist(),
                        'score': float(score),
                        'n_clusters': n_clusters,
                        'noise_points': int((labels == -1).sum()),
                    }
                    # pairwise for DBSCAN (exclude noise points)
                    pair_scores = {}
                    feat_names = results.get('feature_names') or ['f0','f1','f2','f3']
                    mask = labels != -1
                    for i in range(features.shape[1]):
                        for j in range(i+1, features.shape[1]):
                            sub = features_scaled[mask][:, [i, j]]
                            sub_labels = labels[mask]
                            try:
                                ps = silhouette_score(sub, sub_labels)
                                pair_key = f"{feat_names[i]}__{feat_names[j]}"
                                pair_scores[pair_key] = float(ps)
                            except Exception:
                                pass
                    results['methods']['dbscan']['pairwise_scores'] = pair_scores
                    
                    if score > results['best_score']:
                        results['best_score'] = float(score)
                        results['best_method'] = 'DBSCAN'
                else:
                    results['methods']['dbscan'] = {
                        'error': f'Invalid clustering: {n_clusters} clusters'
                    }
            except Exception as e:
                logger.error(f"Error in DBSCAN: {str(e)}")
                results['methods']['dbscan'] = {'error': str(e)}
            
            # Calculate cluster statistics
            ClusteringService._add_cluster_statistics(results)

            # Determine best feature-pair across all methods using pairwise_scores
            best_pair = None
            best_pair_score = -999
            # KMeans list
            for km in results['methods'].get('kmeans', []):
                ps = km.get('pairwise_scores', {})
                for pair_key, score in ps.items():
                    if score is not None and score > best_pair_score:
                        best_pair_score = score
                        best_pair = {
                            'method': f"KMeans (k={km.get('k')})",
                            'pair': pair_key,
                            'score': float(score)
                        }

            # Other methods
            for name in ['hierarchical', 'dbscan']:
                method_data = results['methods'].get(name)
                if isinstance(method_data, dict):
                    ps = method_data.get('pairwise_scores', {})
                    for pair_key, score in ps.items():
                        if score is not None and score > best_pair_score:
                            best_pair_score = score
                            method_label = 'Hierarchical (n=3)' if name == 'hierarchical' else 'DBSCAN'
                            best_pair = {
                                'method': method_label,
                                'pair': pair_key,
                                'score': float(score)
                            }

            if best_pair:
                results['best_pair'] = best_pair

            return results
        
        except Exception as e:
            logger.error(f"Error performing clustering: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def _add_cluster_statistics(results):
        """Add cluster size and composition statistics"""
        stocks = results['stocks']
        
        # Stats for each method
        for method_name, method_data in results['methods'].items():
            if isinstance(method_data, dict) and 'error' in method_data:
                continue
            
            if method_name == 'kmeans':
                for km_result in method_data:
                    labels = km_result['labels']
                    clusters = {}
                    for i, label in enumerate(labels):
                        if label not in clusters:
                            clusters[label] = []
                        clusters[label].append(stocks[i])
                    
                    km_result['clusters'] = {
                        str(i): {
                            'size': len(cluster),
                            'stocks': cluster,
                            'company_composition': ClusteringService._get_company_composition(cluster),
                        }
                        for i, cluster in sorted(clusters.items())
                    }
            else:
                # Hierarchical or DBSCAN
                labels = method_data['labels']
                clusters = {}
                for i, label in enumerate(labels):
                    if label not in clusters:
                        clusters[label] = []
                    clusters[label].append(stocks[i])
                
                method_data['clusters'] = {
                    str(i): {
                        'size': len(cluster),
                        'stocks': cluster,
                        'company_composition': ClusteringService._get_company_composition(cluster),
                    }
                    for i, cluster in sorted(clusters.items())
                }
    
    @staticmethod
    def _get_company_composition(cluster_stocks):
        """Get count of stocks per company in a cluster"""
        composition = {}
        for stock in cluster_stocks:
            symbol = stock['symbol']
            composition[symbol] = composition.get(symbol, 0) + 1
        return composition
