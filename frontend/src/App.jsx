import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { portfolioAPI } from './services/api';
import CreatePortfolio from './pages/CreatePortfolio';
import PortfolioDetail from './pages/PortfolioDetail';
import StockAnalysis from './pages/StockAnalysis';
import RegressionAnalysis from './pages/RegressionAnalysis';
import ClusterView from './pages/ClusterView';
import PCAVisualization from './pages/PCAVisualization';
import PCAKMeansPlot from './pages/PCAKMeansPlot';
import CombinedAnalytics from './pages/CombinedAnalytics';
import Dashboard from './pages/Dashboard';
import GoldSilver from './pages/GoldSilver';
import Login from './pages/Login';
import Profile from './pages/Profile';
import './App.css';

function MyPortfolioRedirect() {
  const navigate = useNavigate();
  React.useEffect(() => {
    (async () => {
      try {
        const p = await portfolioAPI.getOrCreateByName('My Portfolio', 'Automatically created My Portfolio');
        navigate(`/portfolio/${p.id}`);
      } catch (e) {
        console.error(e);
        navigate('/');
      }
    })();
  }, [navigate]);
  return <div className="loading">Redirecting to My Portfolio...</div>;
}

function LogoutRedirect() {
  const navigate = useNavigate();
  React.useEffect(() => {
    localStorage.removeItem('stockkk_user');
    navigate('/');
  }, [navigate]);
  return <div className="loading">Signing out...</div>;
}

const Home = () => {
  const navigate = useNavigate();
  const user = React.useMemo(() => {
    const userRaw = localStorage.getItem('stockkk_user');
    try {
      return userRaw ? JSON.parse(userRaw) : null;
    } catch (e) {
      console.error('invalid user stored', e);
      return null;
    }
  }, []);
  const displayUser = user
    ? (typeof user === 'string' ? user : (user.email || user.username || JSON.stringify(user)))
    : '';
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demoDeleted, setDemoDeleted] = useState(false);
  const [inrTotals, setInrTotals] = useState({});
  const createGoldSilver = async () => {
    try {
      setLoading(true);
      const p = await portfolioAPI.getOrCreateByName('Gold & Silver', 'Gold and Silver combined');
      await portfolioAPI.addCompanyToPortfolioByName('Gold & Silver', 'GLD', { quantity: 1 });
      await portfolioAPI.addCompanyToPortfolioByName('Gold & Silver', 'SLV', { quantity: 1 });
      navigate(`/portfolio/${p.id}/analytics`);
    } catch (e) {
      console.error(e);
      alert('Failed to create Gold & Silver portfolio');
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolios = async () => {
    console.log('loadPortfolios called');
    try {
      setLoading(true);
      const response = await portfolioAPI.getAll();
      console.log('API response', response);
      const list = response.data.results || response.data;
      const demo = !demoDeleted && list.find(p => (p.name || '').toLowerCase() === 'demo portfolio');
      if (demo) {
        try {
          await portfolioAPI.delete(demo.id);
          setDemoDeleted(true);
          const refreshed = await portfolioAPI.getAll();
          const refreshedList = refreshed.data.results || refreshed.data;
          setPortfolios(refreshedList);
          try {
            const promises = (refreshedList || []).map(p => portfolioAPI.getINRSummary(p.id).then(r => ({ id: p.id, total: r.data.total_value_inr })).catch(() => null));
            const results = await Promise.all(promises);
            const map = {};
            results.forEach(x => { if (x) map[x.id] = x.total; });
            setInrTotals(map);
          } catch { }
        } catch (e) {
          console.error('Failed to delete Demo Portfolio', e);
          setPortfolios(list);
          try {
            const promises = (list || []).map(p => portfolioAPI.getINRSummary(p.id).then(r => ({ id: p.id, total: r.data.total_value_inr })).catch(() => null));
            const results = await Promise.all(promises);
            const map = {};
            results.forEach(x => { if (x) map[x.id] = x.total; });
            setInrTotals(map);
          } catch { }
        }
      } else {
        setPortfolios(list);
        try {
          const promises = (list || []).map(p => portfolioAPI.getINRSummary(p.id).then(r => ({ id: p.id, total: r.data.total_value_inr })).catch(() => null));
          const results = await Promise.all(promises);
          const map = {};
          results.forEach(x => { if (x) map[x.id] = x.total; });
          setInrTotals(map);
        } catch { }
      }
      setError('');
    } catch (err) {
      const apiMessage = err?.response?.data?.error;
      const networkIssue = err?.code === 'ERR_NETWORK' || !err?.response;
      setError(apiMessage || (networkIssue ? 'Cannot reach backend server. Start Django on port 8000.' : 'Error loading portfolios'));
      console.error('loadPortfolios error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadPortfolios();
  }, [user]);

  if (loading) {
    return <div className="loading">Loading portfolios...</div>;
  }

  return (
    <div className="home-container">
      <div className="hero-section">
        <div className="hero-content">
          <div className="header-branding">
📈 Welcome to StockStop Dashboard
            <p>Analyze your investment portfolio with AI-powered insights</p>
          </div>
          <button
            className="btn btn-primary btn-large"
            onClick={() => navigate('/create-portfolio')}
          >
            Create New Portfolio
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="portfolios-section">
        <h2>Your Portfolios</h2>

        {portfolios.length > 0 ? (
          <div className="portfolios-grid">
            {portfolios.map((portfolio) => (
              <div
                key={portfolio.id}
                className="portfolio-card"
                onClick={() => navigate(`/portfolio/${portfolio.id}`)}
              >
                <div className="card-header">
                  <h3>{portfolio.name}</h3>
                  <span className="portfolio-id">ID: {portfolio.id}</span>
                  <span className="stock-count">{portfolio.stock_count} stocks</span>
                </div>

                <div className="card-body">
                  {portfolio.description && (
                    <p className="description">{(portfolio.description || '').replace(/^demo portfolio:\s*/i, '')}</p>
                  )}

                  <div className="portfolio-stat">
                    <span className="label">Total Value</span>
                    <span className="value">₹{(inrTotals[portfolio.id] ?? 0).toFixed(2)}</span>
                  </div>

                  <div className="card-footer">
                    <span className="date">
                      Created: {new Date(portfolio.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  className="card-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/portfolio/${portfolio.id}/dashboard`);
                  }}
                >
                  Dashboard →
                </button>

                <button
                  className="card-action"
                  style={{ marginTop: '10px', backgroundColor: '#6c757d' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/portfolio/${portfolio.id}`);
                  }}
                >
                  Manage Stocks →
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No portfolios yet</h3>
            <p>Create your first portfolio to start analyzing stocks</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/create-portfolio')}
            >
              Create Portfolio
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const userRaw = typeof window !== 'undefined' ? localStorage.getItem('stockkk_user') : null;
  let user = null;
  try {
    user = userRaw ? JSON.parse(userRaw) : null;
  } catch {
    user = null;
  }
  const displayUser = user ? (typeof user === 'string' ? user : (user.email || user.username || JSON.stringify(user))) : null;
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-brand">
              <span className="logo-icon">📊</span>
              <span className="brand-text">StockStop</span>
              <span className="brand-pill">LIVE</span>
            </Link>
            <div className="nav-links">
              <Link to="/">Home</Link>
              {user && <Link to="/profile">My Profile</Link>}
              {user && <Link to="/gold-silver">Gold & Silver</Link>}
              {user && <Link to="/my-portfolio" className="nav-btn">My Portfolio</Link>}
              {user && <Link to="/create-portfolio" className="nav-btn">+ Create Portfolio</Link>}
              {user ? (
                <Link to="/logout">Logout ({displayUser})</Link>
              ) : (
                <Link to="/login">Login</Link>
              )}
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-portfolio" element={<CreatePortfolio />} />
            <Route path="/portfolio/:id" element={<PortfolioDetail />} />
            <Route path="/portfolio/:id/dashboard" element={<Dashboard />} />
            <Route path="/portfolio/:id/clustering" element={<ClusterView />} />
            <Route path="/portfolio/:id/pca" element={<PCAVisualization />} />
            <Route path="/portfolio/:id/pca-kmeans-plot" element={<PCAKMeansPlot />} />
            <Route path="/portfolio/:id/regression" element={<RegressionAnalysis />} />
            <Route path="/portfolio/:id/analytics" element={<CombinedAnalytics />} />
            <Route path="/gold-silver" element={<GoldSilver />} />
            <Route path="/stock/:id/analysis" element={<StockAnalysis />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-portfolio" element={<MyPortfolioRedirect />} />
            <Route path="/logout" element={<LogoutRedirect />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>&copy; 2026 StockStop. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;




