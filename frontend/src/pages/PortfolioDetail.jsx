import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { portfolioAPI, stockAPI } from '../services/api';
import StockForm from '../components/StockForm';
import StockList from '../components/StockList';
import ChartCard from '../components/ChartCard';
import './PortfolioDetail.css';

const PortfolioDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddStock, setShowAddStock] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);
  const [portfolioAnalyzing, setPortfolioAnalyzing] = useState(false);
  const [highlights, setHighlights] = useState(null);
  const [chartsData, setChartsData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [clusterData, setClusterData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [inrSummary, setInrSummary] = useState(null);

  useEffect(() => {
    loadPortfolio();
  }, [id]);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const response = await portfolioAPI.getById(id);
      setPortfolio(response.data);
      try {
        const inrRes = await portfolioAPI.getINRSummary(id);
        setInrSummary(inrRes.data);
      } catch {}
      setError('');
    } catch (err) {
      const apiMessage = err?.response?.data?.error;
      const networkIssue = err?.code === 'ERR_NETWORK' || !err?.response;
      setError(apiMessage || (networkIssue ? 'Cannot reach backend server. Start Django on port 8000.' : 'Error loading portfolio'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (stockData) => {
    try {
      const response = await portfolioAPI.addStock(id, stockData);
      setShowAddStock(false);
      loadPortfolio();
    } catch (err) {
      setError(err.response?.data?.error || 'Error adding stock');
    }
  };

  const handleAnalyzeStock = async (stockId, pastDays) => {
    try {
      setAnalyzing(stockId);
      await stockAPI.analyze(stockId, pastDays);
      // Navigate to analysis page immediately after analysis completes
      navigate(`/stock/${stockId}/analysis`);
    } catch (err) {
      setError('Error analyzing stock');
      setAnalyzing(null);
    }
  };
  
  const handleAnalyzeAll = async () => {
    try {
      setPortfolioAnalyzing(true);
      const res = await portfolioAPI.analyzeAllLive(id, 365);
      const analyses = res.data.analyses || [];
      const by = (key) => analyses.reduce((best, a) => best === null || (parseFloat(a[key] || 0) > parseFloat(best[key] || 0)) ? a : best, null);
      const topPE = by('pe_ratio_current');
      const topDiscount = by('discount_percentage');
      const topOpportunity = by('opportunity_score');
      setHighlights({
        pe: topPE,
        discount: topDiscount,
        opportunity: topOpportunity,
      });
      setChartsData({
        peRatios: analyses.map(a => ({ name: a.company.symbol, value: a.pe_ratio_current || 0 })),
        discounts: analyses.map(a => ({ name: a.company.symbol, value: a.discount_percentage || 0 })),
        opportunities: analyses.map(a => ({ name: a.company.symbol, value: a.opportunity_score || 0 })),
      });
      const pts = analyses.map(a => ({ name: a.company.symbol, x: parseFloat(a.discount_percentage || 0), y: parseFloat(a.opportunity_score || 0) }));
      const k = Math.min(3, pts.length || 1);
      if (pts.length > 0) {
        const centroids = pts.slice(0, k).map(p => [p.x, p.y]);
        let labels = new Array(pts.length).fill(0);
        for (let iter = 0; iter < 20; iter++) {
          labels = pts.map(p => {
            const d = centroids.map(c => Math.hypot(p.x - c[0], p.y - c[1]));
            return d.indexOf(Math.min(...d));
          });
          for (let i = 0; i < k; i++) {
            const group = pts.filter((_, idx) => labels[idx] === i);
            if (group.length) {
              const mx = group.reduce((s, g) => s + g.x, 0) / group.length;
              const my = group.reduce((s, g) => s + g.y, 0) / group.length;
              centroids[i] = [mx, my];
            }
          }
        }
        setClusterData(pts.map((p, idx) => ({ ...p, cluster: labels[idx] })));
      } else {
        setClusterData(null);
      }
      const avg = (arr, key) => arr.length ? arr.reduce((s,a)=>s+parseFloat(a[key]||0),0)/arr.length : 0;
      const recCounts = analyses.reduce((acc,a)=>{const r=(a.recommendation||'HOLD'); acc[r]=(acc[r]||0)+1; return acc;}, {});
      setSummary({
        avgPE: avg(analyses, 'pe_ratio_current'),
        avgDiscount: avg(analyses, 'discount_percentage'),
        avgOpportunity: avg(analyses, 'opportunity_score'),
        counts: recCounts,
      });
      await loadPortfolio();
      setPortfolioAnalyzing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error analyzing portfolio');
      setPortfolioAnalyzing(false);
    }
  };

  const handleDeleteStock = async (stockId) => {
    if (window.confirm('Are you sure you want to remove this stock?')) {
      try {
        await stockAPI.delete(stockId);
        loadPortfolio();
      } catch (err) {
        setError('Error deleting stock');
      }
    }
  };

  const handleRefreshPrices = async () => {
    try {
      setRefreshing(true);
      const response = await portfolioAPI.refreshPrices(id);
      setPortfolio(response.data.portfolio);
      setError(`✓ Refreshed ${response.data.updated.length} stocks (${response.data.failed.length} failed)`);
      setTimeout(() => setError(''), 5000);
    } catch (err) {
      setError('Error refreshing prices');
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading portfolio...</div>;
  }

  if (!portfolio) {
    return (
      <div className="error-container">
        <p>Portfolio not found</p>
        <button onClick={() => navigate('/')}>Back to Portfolios</button>
      </div>
    );
  }

  return (
    <div className="portfolio-detail-container">
      <div className="portfolio-header">
        <h1>{portfolio.name}</h1>
        {portfolio.description && <p className="description">{(portfolio.description || '').replace(/^demo portfolio:\s*/i, '')}</p>}
        
        <div className="portfolio-stats">
          <div className="stat">
            <span className="label">Total Value</span>
            <span className="value">₹{(inrSummary?.total_value_inr ?? 0).toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="label">Total Investment</span>
            <span className="value">₹{(inrSummary?.total_investment_inr ?? 0).toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="label">Total Gain/Loss</span>
            <span className={`value ${portfolio.total_gain_loss >= 0 ? 'positive' : 'negative'}`}>
              ₹{(inrSummary?.total_gain_loss_inr ?? 0).toFixed(2)} ({(inrSummary?.total_gain_loss_percentage ?? 0).toFixed(2)}%)
            </span>
          </div>
        </div>
        
        <div className="portfolio-actions">
          <button 
            className="btn btn-primary"
            onClick={handleAnalyzeAll}
            disabled={portfolioAnalyzing}
          >
            {portfolioAnalyzing ? 'Analyzing Portfolio...' : 'Analyze Entire Portfolio'}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleRefreshPrices}
            disabled={refreshing}
            title="Fetch latest live prices for all stocks"
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Prices'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="portfolio-content">
        <div className="section-header">
          <h2>Stocks in Portfolio</h2>
          <div className="button-group">
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/portfolio/${id}/pca`)}
              title="PCA visualization of stocks"
            >
              📊 PCA Analysis
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => navigate(`/portfolio/${id}/analytics`)}
              title="Combined analytics dashboard"
            >
              🔎 Full Analytics
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddStock(!showAddStock)}
            >
              {showAddStock ? 'Cancel' : 'Add Stock'}
            </button>
          </div>
        </div>

        {showAddStock && (
          <div className="add-stock-section">
            <StockForm onSubmit={handleAddStock} />
          </div>
        )}

        {portfolio.stocks && portfolio.stocks.length > 0 ? (
          <StockList 
            stocks={portfolio.stocks}
            onAnalyze={handleAnalyzeStock}
            onDelete={handleDeleteStock}
            analyzing={analyzing}
            inrIndex={inrSummary?.stocks ? Object.fromEntries(inrSummary.stocks.map(s => [s.symbol, s])) : {}}
          />
        ) : (
          <div className="empty-state">
            <p>No stocks in this portfolio yet.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddStock(true)}
            >
              Add Your First Stock
            </button>
          </div>
        )}
      </div>

      {chartsData && (
        <div className="portfolio-charts">
          <h2>Portfolio Analysis</h2>
          <div className="charts-grid">
            <ChartCard
              title="PE Ratio by Stock"
              description="Current PE across all stocks"
              type="bar"
              data={chartsData.peRatios}
              dataKey="value"
              nameKey="name"
            />
            <ChartCard
              title="Discount % by Stock"
              description="Discount vs fair value per stock"
              type="bar"
              data={chartsData.discounts}
              dataKey="value"
              nameKey="name"
            />
            <ChartCard
              title="Opportunity Score by Stock"
              description="Investment opportunity (0-100)"
              type="bar"
              data={chartsData.opportunities}
              dataKey="value"
              nameKey="name"
            />
          </div>
        </div>
      )}

      {clusterData && (
        <div className="portfolio-charts">
          <h2>Cluster Chart</h2>
          <ChartCard
            title="Clusters (Discount vs Opportunity)"
            description="Colored by cluster"
            type="scatter"
            data={clusterData}
            xKey="x"
            yKey="y"
            clusterKey="cluster"
            fullWidth={true}
          />
        </div>
      )}

      {summary && (
        <div className="portfolio-summary">
          <h2>Portfolio Summary</h2>
          <div className="portfolio-stats">
            <div className="stat">
              <span className="label">Avg PE</span>
              <span className="value">{summary.avgPE.toFixed(2)}</span>
            </div>
            <div className="stat">
              <span className="label">Avg Discount %</span>
              <span className={`value ${summary.avgDiscount >= 0 ? 'positive' : 'negative'}`}>{summary.avgDiscount.toFixed(2)}%</span>
            </div>
            <div className="stat">
              <span className="label">Avg Opportunity</span>
              <span className="value">{summary.avgOpportunity.toFixed(2)}</span>
            </div>
          </div>
          <div className="recommendation-counts">
            <div className="stat"><span className="label">STRONG_BUY</span><span className="value">{summary.counts.STRONG_BUY || 0}</span></div>
            <div className="stat"><span className="label">BUY</span><span className="value">{summary.counts.BUY || 0}</span></div>
            <div className="stat"><span className="label">HOLD</span><span className="value">{summary.counts.HOLD || 0}</span></div>
            <div className="stat"><span className="label">SELL</span><span className="value">{summary.counts.SELL || 0}</span></div>
            <div className="stat"><span className="label">STRONG_SELL</span><span className="value">{summary.counts.STRONG_SELL || 0}</span></div>
          </div>
        </div>
      )}

      {highlights && (
        <div className="portfolio-highlights">
          <h2>Portfolio Highlights</h2>
          <div className="highlights-grid">
            <div className="highlight-card">
              <div className="card-header">
                <h3>Highest PE Ratio</h3>
              </div>
              <div className="card-body">
                <div className="metric">
                  <span className="label">Stock</span>
                  <span className="value">{highlights.pe?.company?.symbol}</span>
                </div>
                <div className="metric">
                  <span className="label">PE Ratio</span>
                  <span className="value">{(highlights.pe?.pe_ratio_current || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="highlight-card">
              <div className="card-header">
                <h3>Highest Discount</h3>
              </div>
              <div className="card-body">
                <div className="metric">
                  <span className="label">Stock</span>
                  <span className="value">{highlights.discount?.company?.symbol}</span>
                </div>
                <div className="metric">
                  <span className="label">Discount %</span>
                  <span className="value">{(highlights.discount?.discount_percentage || 0).toFixed(2)}%</span>
                </div>
              </div>
            </div>
            <div className="highlight-card">
              <div className="card-header">
                <h3>Highest Opportunity</h3>
              </div>
              <div className="card-body">
                <div className="metric">
                  <span className="label">Stock</span>
                  <span className="value">{highlights.opportunity?.company?.symbol}</span>
                </div>
                <div className="metric">
                  <span className="label">Opportunity Score</span>
                  <span className="value">{(highlights.opportunity?.opportunity_score || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="portfolio-actions">
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/')}
        >
          Back to Portfolios
        </button>
      </div>
    </div>
  );
};

export default PortfolioDetail;
