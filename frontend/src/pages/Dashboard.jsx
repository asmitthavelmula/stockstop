import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { portfolioAPI } from '../services/api';
import PortfolioGrowthChart from '../components/PortfolioGrowthChart';
import PortfolioTable from '../components/PortfolioTable';
import ValueMatrix from '../components/ValueMatrix';
import PortfolioClustering from '../components/PortfolioClustering';
import StockPrediction from '../components/StockPrediction';
import './Dashboard.css';

const Dashboard = () => {
  const { id } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [growthData, setGrowthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setSyncing(true);
        const portfolioId = id || (await portfolioAPI.findByName('My Portfolio'))?.id;

        if (!portfolioId) {
          setError('No portfolio found. Please create one.');
          setLoading(false);
          return;
        }

        const [portfolioRes, growthRes] = await Promise.all([
          portfolioAPI.getById(portfolioId, { params: { refresh_prices: 'true' } }),
          portfolioAPI.getGrowthData(portfolioId, 30)
        ]);

        setPortfolio(portfolioRes.data);
        setGrowthData(growthRes.data);
        setError('');
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="dashboard-loading">Loading Dashboard...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!portfolio) return <div className="dashboard-error">Portfolio not found.</div>;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-branding">
          <div className="title-row">
            <h1>{portfolio.name} Dashboard</h1>
            {syncing && <span className="sync-badge">Live Syncing...</span>}
          </div>
          <p className="subtitle">Real-time allocation & predictive analytics</p>
        </div>

        <div className="portfolio-summary-cards">
          <div className="summary-card">
            <span className="label">Total Portfolio Value</span>
            <span className="value">₹{Number(portfolio.total_value || 0).toLocaleString()}</span>
          </div>
          <div className="summary-card">
            <span className="label">Performance Metrics</span>
            <span className={`value ${portfolio.total_gain_loss >= 0 ? 'positive' : 'negative'}`}>
              {portfolio.total_gain_loss >= 0 ? '▲' : '▼'} ₹{Math.abs(Number(portfolio.total_gain_loss || 0)).toLocaleString()}
              <small>({Number(portfolio.total_gain_loss_percentage || 0).toFixed(2)}%)</small>
            </span>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="top-grid">
          <section className="chart-section">
            <PortfolioGrowthChart data={growthData} title="Equity Curve (30D)" />
          </section>
        </div>

        <div className="analytics-grid">
          <section className="matrix-section">
            <ValueMatrix stocks={portfolio.stocks} />
          </section>

          <section className="prediction-section">
            <StockPrediction stocks={portfolio.stocks} />
          </section>
        </div>

        <section className="clustering-section">
          <PortfolioClustering portfolioId={portfolio.id} />
        </section>

        <section className="table-section">
          <PortfolioTable stocks={portfolio.stocks} />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
