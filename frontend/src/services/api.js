import axios from 'axios';

// Resolve API base URL from environment when provided.
// - In development, default to relative `/api` so CRA proxy handles routing to backend.
// - For production builds, set REACT_APP_API_BASE_URL to backend `/api` URL
//   (e.g. http://localhost:8000/api).
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL, // proxy to backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Portfolio APIs
export const portfolioAPI = {
  // Get all portfolios
  getAll: () => api.get('/portfolios/'),

  // Get portfolio details with stocks
  getById: (id) => api.get(`/portfolios/${id}/`),

  // Create new portfolio
  create: (data) => api.post('/portfolios/', data),

  // Update portfolio
  update: (id, data) => api.put(`/portfolios/${id}/`, data),

  // Delete portfolio
  delete: (id) => api.delete(`/portfolios/${id}/`),

  // Add stock to portfolio
  addStock: (id, stockData) => api.post(`/portfolios/${id}/add_stock/`, stockData),
  // Find portfolio by name (client-side)
  findByName: async (name) => {
    const res = await api.get('/portfolios/');
    const list = res.data.results || res.data;
    return list.find(p => p.name === name);
  },

  // Get or create a portfolio by name (client-side helper)
  getOrCreateByName: async (name, description = '') => {
    const existing = await portfolioAPI.findByName(name);
    if (existing) return existing;
    const createRes = await api.post('/portfolios/', { name, description });
    return createRes.data;
  },

  // Add a company to a portfolio by portfolio name (creates portfolio if missing)
  addCompanyToPortfolioByName: async (portfolioName, company_symbol, overrides = {}) => {
    const portfolio = await portfolioAPI.getOrCreateByName(portfolioName, `${portfolioName} (auto-created)`);
    const stockData = {
      // backend expects a field named "symbol",
      // our frontend sometimes calls it company_symbol elsewhere so translate here
      symbol: company_symbol,
      quantity: overrides.quantity || 1,
      purchase_price: overrides.purchase_price || overrides.current_price || 0,
      purchase_date: overrides.purchase_date || new Date().toISOString().slice(0,10),
    };
    const res = await api.post(`/portfolios/${portfolio.id}/add_stock/`, stockData);
    return res.data;
  },

  // Get clustering analysis for a portfolio
  getClustering: (id) => api.get(`/portfolios/${id}/clustering/`),
  
  // Analyze all stocks in a portfolio
  analyzeAll: (id, pastDays = 365) => api.post(`/portfolios/${id}/analyze_all/`, { past_days: pastDays }),
  analyzeAllLive: (id, pastDays = 365) => api.post(`/portfolios/${id}/analyze_all_live/`, { past_days: pastDays }),
  
  // Refresh live prices for all stocks in a portfolio
  refreshPrices: (id) => api.post(`/portfolios/${id}/refresh_prices/`),
  
  // Get PCA analysis for portfolio visualization
  getPCAAnalysis: (id) => api.get(`/portfolios/${id}/pca_analysis/`),

  // Get PCA + KMeans scatter plot as base64 PNG
  getPCAKMeansPlot: (id, k = 3) => api.get(`/portfolios/${id}/pca-kmeans-plot/?k=${k}`),
  
  // Get linear regression analysis for stock price trends
  getRegressionAnalysis: (id, pastDays = 365, forecastDays = 30) => api.get(`/portfolios/${id}/regression_analysis/?past_days=${pastDays}&forecast_days=${forecastDays}`),
  
  // Get INR summary for a portfolio
  getINRSummary: (id) => api.get(`/portfolios/${id}/inr_summary/`),

  // Get live asset forecast for Crypto AI portfolio section
  getAssetForecast: (id, asset = 'BTC-USD', pastDays = 180, forecastDays = 30) =>
    api.get(`/portfolios/${id}/asset_forecast/?asset=${encodeURIComponent(asset)}&past_days=${pastDays}&forecast_days=${forecastDays}`),

  // Get portfolio growth data (total value over time)
  getGrowthData: (id, days = 30) => api.get(`/portfolios/${id}/growth_data/?days=${days}`),

  // Get total portfolio growth data (aggregate across all portfolios)
  getTotalGrowthData: (days = 30) => api.get(`/portfolios/portfolio-growth/?days=${days}`),
};

// Stock APIs
export const stockAPI = {
  // Get stock details
  getById: (id) => api.get(`/stocks/${id}/`),

  // Get stocks for a portfolio
  getByPortfolio: (portfolioId) => api.get(`/stocks/?portfolio_id=${portfolioId}`),

  // Delete stock
  delete: (id) => api.delete(`/stocks/${id}/`),

  // Analyze stock
  analyze: (id, pastDays) => api.post(`/stocks/${id}/analyze/`, { past_days: pastDays }),

  // Get price history
  getPriceHistory: (id, pastDays) => api.get(`/stocks/${id}/price_history/?past_days=${pastDays}`),

  // Get latest analysis
  getLatestAnalysis: (id) => api.get(`/stocks/${id}/latest_analysis/`),

  // Live time-series regression for a stock
  getLiveRegression: (id, pastDays = 180, forecastDays = 30, model = 'linear') =>
    api.get(`/stocks/${id}/live_regression/?past_days=${pastDays}&forecast_days=${forecastDays}&model=${model}`),
};

// Company APIs
export const companyAPI = {
  // Search company by symbol
  search: (symbol) => api.get(`/companies/search/?symbol=${symbol}`),

  // Get all companies
  getAll: () => api.get('/companies/'),

  // Get company details
  getById: (id) => api.get(`/companies/${id}/`),
};

// Gold & Silver specialized APIs
export const goldSilverAPI = {
  getPrices: (pastDays = 365) => api.get(`/gold_silver/prices/?past_days=${pastDays}`),
  getRegression: (pastDays = 365, forecastDays = 30) => api.get(`/gold_silver/regression/?past_days=${pastDays}&forecast_days=${forecastDays}`),
  getCorrelation: (pastDays = 365, window = 30) => api.get(`/gold_silver/correlation/?past_days=${pastDays}&window=${window}`),
};

export default api;
