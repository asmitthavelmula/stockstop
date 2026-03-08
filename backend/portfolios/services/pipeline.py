import pandas as pd
from .clustering_service import ClusteringService
from .regression import run_linear_regression
from .logistic import run_logistic
from ..models import Portfolio, HistoricalPrice


def run_portfolio_analysis(portfolio_id):
    """Perform full analysis pipeline for a portfolio and return JSON result."""
    result = {'stocks': [], 'correlation': {}}

    try:
        portfolio = Portfolio.objects.get(pk=portfolio_id)
    except Portfolio.DoesNotExist:
        return {'error': 'Portfolio not found'}

    stocks = portfolio.stocks.select_related('company').all()
    if not stocks:
        return result

    # clustering
    cluster_res = ClusteringService.perform_clustering(portfolio)
    labels = []
    # determine which label set to use (best method)
    best_method = cluster_res.get('best_method')
    if best_method:
        if best_method.startswith('KMeans'):
            for km in cluster_res.get('methods', {}).get('kmeans', []):
                if best_method == f"KMeans (k={km.get('k')})":
                    labels = km.get('labels', [])
                    break
        elif best_method.startswith('Hierarchical'):
            labels = cluster_res.get('methods', {}).get('hierarchical', {}).get('labels', [])
        elif best_method.startswith('DBSCAN'):
            labels = cluster_res.get('methods', {}).get('dbscan', {}).get('labels', [])
    # fallback if no best_method or labels
    if not labels:
        # try first available label list
        km_list = cluster_res.get('methods', {}).get('kmeans', [])
        if km_list:
            labels = km_list[0].get('labels', [])
        else:
            hier = cluster_res.get('methods', {}).get('hierarchical', {})
            labels = hier.get('labels', []) if isinstance(hier, dict) else []
    
    # map stock id -> cluster label
    cluster_map = {}
    for idx, stock_info in enumerate(cluster_res.get('stocks', [])):
        sid = stock_info.get('id')
        if sid is not None and idx < len(labels):
            cluster_map[sid] = labels[idx]

    # build dataframe rows
    rows = []
    for stock in stocks:
        analysis = stock.analyses.first()
        pe = None
        if analysis is not None and analysis.pe_ratio_current is not None:
            pe = float(analysis.pe_ratio_current)
        else:
            pe = float(stock.company.pe_ratio or 0)

        current_price = 0.0
        if analysis is not None and analysis.current_price is not None:
            current_price = float(analysis.current_price)
        else:
            current_price = float(stock.company.current_price or 0)

        # compute historical stats
        price_range = 0.0
        volatility_ratio = 0.0
        hist_qs = HistoricalPrice.objects.filter(company=stock.company)
        if hist_qs.exists():
            try:
                dfh = pd.DataFrame(list(hist_qs.values('high_price', 'low_price', 'close_price')))
                if not dfh.empty:
                    maxhigh = dfh['high_price'].max()
                    minlow = dfh['low_price'].min()
                    price_range = float(maxhigh - minlow)
                    mean_close = dfh['close_price'].mean() or 0.0
                    if mean_close:
                        volatility_ratio = float(dfh['close_price'].std(ddof=0) / mean_close)
            except Exception:
                price_range = 0.0
                volatility_ratio = 0.0

        rows.append({
            'stock_id': stock.id,
            'symbol': stock.company.symbol,
            'pe_ratio': pe,
            'current_price': current_price,
            'price_range': price_range,
            'volatility_ratio': volatility_ratio,
            'cluster': cluster_map.get(stock.id)
        })

    df = pd.DataFrame(rows)
    if df.empty:
        return result

    # run models
    df = run_linear_regression(df)
    df = run_logistic(df)

    try:
        corr = df.corr().to_dict()
    except Exception:
        corr = {}

    result['stocks'] = df.to_dict(orient='records')
    result['correlation'] = corr
    return result
