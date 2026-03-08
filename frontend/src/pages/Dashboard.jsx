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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // If ID is provided, fetch specific portfolio, otherwise fetch aggregate (optional logic)
        const portfolioId = id || (await portfolioAPI.findByName('My Portfolio'))?.id;
        
        if (!portfolioId) {
          setError('No portfolio found. Please create one.');
          setLoading(false);
          return;
        }

        const [portfolioRes, growthRes] = await Promise.all([
          portfolioAPI.getById(portfolioId),
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
        <h1>{portfolio.name} Dashboard</h1>
        <div className="portfolio-summary-cards">
          <div className="summary-card">
            <span className="label">Total Value</span>
            <span className="value">₹{Number(portfolio.total_value || 0).toLocaleString()}</span>
          </div>
          <div className="summary-card">
            <span className="label">Total Profit/Loss</span>
            <span className={`value ${portfolio.total_gain_loss >= 0 ? 'positive' : 'negative'}`}>
              ₹{Number(portfolio.total_gain_loss || 0).toLocaleString()}
              <small>({Number(portfolio.total_gain_loss_percentage || 0).toFixed(2)}%)</small>
            </span>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="chart-section">
          <PortfolioGrowthChart data={growthData} title="Portfolio Growth (Last 30 Days)" />
        </section>

        <section className="matrix-section">
          <ValueMatrix stocks={portfolio.stocks} />
        </section>

        <section className="prediction-section">
          <StockPrediction stocks={portfolio.stocks} />
        </section>

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
