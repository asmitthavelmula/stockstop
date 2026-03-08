import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { portfolioAPI } from '../services/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';
import './RegressionAnalysis.css';

const RegressionAnalysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [regressionData, setRegressionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [pastDays, setPastDays] = useState(365);
  const [forecastDays, setForecastDays] = useState(30);

  useEffect(() => {
    loadRegressionData();
  }, [id, pastDays, forecastDays]);

  const loadRegressionData = async () => {
    try {
      setLoading(true);
      const [portfolioRes, regressionRes] = await Promise.all([
        portfolioAPI.getById(id),
        portfolioAPI.getRegressionAnalysis(id, pastDays, forecastDays),
      ]);
      setPortfolio(portfolioRes.data);
      setRegressionData(regressionRes.data);
      if (regressionRes.data.stocks && regressionRes.data.stocks.length > 0) {
        setSelectedStock(regressionRes.data.stocks[0]);
      }
      setError('');
    } catch (err) {
      setError('Error loading regression analysis');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCombinedChartData = (stock) => {
    if (!stock) return [];
    
    const historical = stock.historical_data || [];
    const future = stock.future_predictions || [];
    
    // Combine historical and future data
    return [
      ...historical.map(h => ({
        date: h.date,
        price: h.price,
        trend: h.trend,
        type: 'historical',
      })),
      ...future.map(f => ({
        date: f.date,
        price: null,
        predicted_price: f.predicted_price,
        lower_bound: f.lower_bound,
        upper_bound: f.upper_bound,
        type: 'future',
      })),
    ];
  };

  const getTrendColor = (regressionData) => {
    if (!regressionData) return '#667eea';
    return regressionData.trend_direction === 'Uptrend' ? '#22c55e' : '#ef4444';
  };

  const RegressionTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="regression-tooltip">
          <p className="date">{data.date}</p>
          {data.price && <p className="price">Price: ₹{data.price.toFixed(2)}</p>}
          {data.trend && <p className="trend">Trend: ₹{data.trend.toFixed(2)}</p>}
          {data.predicted_price && (
            <>
              <p className="predicted">Predicted: ₹{data.predicted_price.toFixed(2)}</p>
              <p className="ci">CI: ₹{data.lower_bound.toFixed(2)} - ₹{data.upper_bound.toFixed(2)}</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="loading">Loading regression analysis...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={() => navigate(`/portfolio/${id}`)} className="btn btn-primary">
          Back to Portfolio
        </button>
      </div>
    );
  }

  if (!regressionData || !regressionData.stocks || regressionData.stocks.length === 0) {
    return (
      <div className="error-container">
        <p>No regression data available</p>
        <button onClick={() => navigate(`/portfolio/${id}`)} className="btn btn-primary">
          Back to Portfolio
        </button>
      </div>
    );
  }

  const chartData = getCombinedChartData(selectedStock);

  return (
    <div className="regression-analysis-container">
      <div className="regression-header">
        <button className="btn btn-secondary" onClick={() => navigate(`/portfolio/${id}`)}>
          ← Back to Portfolio
        </button>
        <h1>📈 Linear Regression Analysis: {portfolio?.name}</h1>
        <p className="subtitle">Stock Price Trends & Predictions</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="regression-content">
        {/* Controls */}
        <div className="controls-section">
          <div className="control-group">
            <label>Historical Period:</label>
            <select value={pastDays} onChange={(e) => setPastDays(parseInt(e.target.value))}>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 6 months</option>
              <option value={365}>Last year</option>
            </select>
          </div>
          <div className="control-group">
            <label>Forecast Period:</label>
            <select value={forecastDays} onChange={(e) => setForecastDays(parseInt(e.target.value))}>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={loadRegressionData}>
            Update Analysis
          </button>
        </div>

        {/* Stock Selection */}
        <div className="stock-selector-section">
          <h3>Select Stock to Analyze</h3>
          <div className="stock-selector-grid">
            {regressionData.stocks.map((stock, idx) => (
              <div
                key={idx}
                className={`stock-selector-item ${selectedStock?.symbol === stock.symbol ? 'selected' : ''}`}
                onClick={() => setSelectedStock(stock)}
              >
                <div className="symbol">{stock.symbol}</div>
                <div className="price">₹{stock.current_price.toFixed(0)}</div>
                <div className={`trend ${stock.regression.trend_direction.toLowerCase()}`}>
                  {stock.regression.trend_direction}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chart */}
        {selectedStock && (
          <div className="chart-section">
            <div className="chart-header">
              <div>
                <h2>{selectedStock.symbol} - {selectedStock.name}</h2>
                <p className="subtitle">{selectedStock.sector}</p>
              </div>
              <div className="regression-stats">
                <div className="stat">
                  <span className="label">R² Score</span>
                  <span className="value">{(selectedStock.regression.r_squared * 100).toFixed(1)}%</span>
                </div>
                <div className="stat">
                  <span className="label">Trend Strength</span>
                  <span className="value">{selectedStock.regression.trend_strength}</span>
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={500}>
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  interval={Math.floor(chartData.length / 10)}
                />
                <YAxis
                  yAxisId="left"
                  label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<RegressionTooltip />} />
                <Legend />

                {/* Historical Data */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="price"
                  stroke="#667eea"
                  dot={false}
                  name="Historical Price"
                  strokeWidth={2}
                />

                {/* Trend Line */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="trend"
                  stroke={getTrendColor(selectedStock.regression)}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Regression Trend"
                  strokeWidth={2}
                />

                {/* Future Predictions with Confidence Interval */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="predicted_price"
                  stroke="#fbbf24"
                  dot={{ r: 3 }}
                  name="Predicted Price"
                  strokeWidth={2}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="upper_bound"
                  fill="none"
                  stroke="none"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="lower_bound"
                  fill="#fbbf24"
                  stroke="none"
                  fillOpacity={0.1}
                  name="95% Confidence Interval"
                />
              </ComposedChart>
            </ResponsiveContainer>

            <div className="chart-legend">
              <div className="legend-item">
                <span className="color" style={{ backgroundColor: '#667eea' }}></span>
                <span>Historical Price</span>
              </div>
              <div className="legend-item">
                <span className="color" style={{ backgroundColor: getTrendColor(selectedStock.regression) }}></span>
                <span>Linear Regression Trend</span>
              </div>
              <div className="legend-item">
                <span className="color" style={{ backgroundColor: '#fbbf24' }}></span>
                <span>Predicted Price</span>
              </div>
              <div className="legend-item">
                <span className="color" style={{ backgroundColor: '#fbbf24', opacity: 0.2 }}></span>
                <span>Confidence Interval (95%)</span>
              </div>
            </div>
          </div>
        )}

        {/* Regression Statistics */}
        {selectedStock && (
          <div className="stats-section">
            <h3>Regression Analysis Results</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Trend Analysis</h4>
                <div className="stat-item">
                  <span className="label">Direction</span>
                  <span className={`value ${selectedStock.regression.trend_direction.toLowerCase()}`}>
                    {selectedStock.regression.trend_direction}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="label">Description</span>
                  <span className="value">{selectedStock.regression.trend_description}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Daily Change</span>
                  <span className={`value ${selectedStock.regression.daily_change >= 0 ? 'positive' : 'negative'}`}>
                    ₹{selectedStock.regression.daily_change.toFixed(4)}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="label">Annual Change</span>
                  <span className={`value ${selectedStock.regression.annual_change >= 0 ? 'positive' : 'negative'}`}>
                    ₹{selectedStock.regression.annual_change.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <h4>Model Quality</h4>
                <div className="stat-item">
                  <span className="label">R² Score</span>
                  <span className="value">{(selectedStock.regression.r_squared * 100).toFixed(2)}%</span>
                  <span className="description">Variance explained</span>
                </div>
                <div className="stat-item">
                  <span className="label">Trend Strength</span>
                  <span className="value">{selectedStock.regression.trend_strength}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Slope</span>
                  <span className="value">{selectedStock.regression.slope.toFixed(4)}</span>
                  <span className="description">Price change per day</span>
                </div>
              </div>

              <div className="stat-card">
                <h4>Price Statistics</h4>
                <div className="stat-item">
                  <span className="label">Current Price</span>
                  <span className="value">₹{selectedStock.current_price.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Average Price</span>
                  <span className="value">₹{selectedStock.statistics.avg_price.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Price Range</span>
                  <span className="value">₹{selectedStock.statistics.price_range.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Volatility (Std Dev)</span>
                  <span className="value">₹{selectedStock.statistics.std_dev.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Future Predictions Table */}
        {selectedStock && selectedStock.future_predictions && selectedStock.future_predictions.length > 0 && (
          <div className="predictions-section">
            <h3>Price Predictions (Next {forecastDays} Days)</h3>
            <div className="predictions-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Predicted Price</th>
                    <th>Lower Bound (95% CI)</th>
                    <th>Upper Bound (95% CI)</th>
                    <th>Range</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStock.future_predictions.slice(0, forecastDays).map((pred, idx) => (
                    <tr key={idx}>
                      <td>{pred.date}</td>
                      <td className="price">₹{pred.predicted_price.toFixed(2)}</td>
                      <td>₹{pred.lower_bound.toFixed(2)}</td>
                      <td>₹{pred.upper_bound.toFixed(2)}</td>
                      <td className="range">±₹{((pred.upper_bound - pred.lower_bound) / 2).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegressionAnalysis;
