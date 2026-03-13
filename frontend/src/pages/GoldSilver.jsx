import React, { useState, useEffect } from 'react';
import { portfolioAPI, fetchLiveData } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, ComposedChart, AreaChart, Area
} from 'recharts';
import './GoldSilver.css';

const GoldSilver = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('1Y');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setSyncing(true);
        const response = await portfolioAPI.getGoldSilverAnalysis();
        setData(response.data);
      } catch (err) {
        console.error('Error fetching gold/silver data:', err);
        const msg = err.response?.data?.error || err.message;
        setError(`Analysis Failed: ${msg}`);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="gold-silver-container loading-container">
        <div className="spinner"></div>
        <h2>Analyzing Real-time Market Data...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gold-silver-container error-container">
        <div className="error-icon">⚠️</div>
        <h2>Analysis Failed</h2>
        <p>{error}</p>
        <button className="gs-btn" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  if (!data || !data.timeseries) return null;

  // Use spot prices from backend or last timeseries point
  const currentGold = data.gold_spot_price || data.timeseries[data.timeseries.length - 1].gold_price;
  const currentSilver = data.silver_spot_price || data.timeseries[data.timeseries.length - 1].silver_price;

  // For linear regression visualization, map timeseries to scatter data
  const scatterData = data.timeseries.map(d => ({
    x: d.gold_price,
    y: d.silver_price,
    y_line: data.regression.slope * d.gold_price + data.regression.intercept
  }));

  // Time Range Filtering Logic
  let filteredTimeseries = data.timeseries;
  if (timeRange === '5D') {
    filteredTimeseries = data.timeseries.slice(-5);
  } else if (timeRange === '1M') {
    filteredTimeseries = data.timeseries.slice(-21);
  } else if (timeRange === '1Y' || timeRange === 'Max') {
    filteredTimeseries = data.timeseries;
  }

  const formatPrice = (value) => new Intl.NumberFormat('en-IN').format(value.toFixed(2));

  return (
    <div className="gold-silver-wrapper">
      <div className="gs-header">
        <div className="title-row">
          <h1>Gold vs Silver Analysis</h1>
          {syncing && <span className="sync-badge">Live Syncing...</span>}
        </div>
        <p>1-Year Performance & Correlation (NSE: {data.gold_ticker} & {data.silver_ticker})</p>
        <div className="current-prices">
          <span className="price-tag gold">
            10g 24k Gold: ₹{formatPrice(currentGold)}
            <small> (Live)</small>
          </span>
          <span className="price-tag silver">
            1kg Silver: ₹{formatPrice(currentSilver)}
            <small> (Live)</small>
          </span>
        </div>
      </div>

      <div className="gs-stats-grid">
        <div className="gs-stat-card primary-stat">
          <h3>Correlation Coefficient</h3>
          <div className={`stat-value ${data.correlation > 0.7 ? 'high-corr' : ''}`}>
            {data.correlation.toFixed(4)}
          </div>
          <p className="stat-desc">
            {data.correlation > 0.7 ? 'Strong positive correlation.' : 'Moderate/weak correlation.'}
          </p>
        </div>

        <div className="gs-stat-card">
          <h3>Linear Regression</h3>
          <div className="stat-equation">{data.regression.equation}</div>
          <div className="stat-details">
            <span className="badge">Slope: {data.regression.slope.toFixed(4)}</span>
            <span className="badge">Intercept: {data.regression.intercept.toFixed(4)}</span>
          </div>
        </div>
      </div>

      <div className="gs-chart-section">
        <div className="gs-chart-card area-chart-card">
          <div className="chart-header-row">
            <h2>Performance Overview</h2>
            <div className="time-toggles">
              {['5D', '1M', '1Y', 'Max'].map(range => (
                <button
                  key={range}
                  className={`time-btn ${timeRange === range ? 'active' : ''}`}
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={filteredTimeseries} margin={{ top: 20, right: 0, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffd700" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ffd700" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSilver" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c0c0c0" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c0c0c0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" opacity={0.3} vertical={false} />
                <XAxis dataKey="date" stroke="#718096" tick={{ fill: '#718096', fontSize: 12 }} minTickGap={30} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#718096" tick={{ fill: '#718096', fontSize: 12 }} domain={['auto', 'auto']} tickFormatter={(val) => `₹${val.toFixed(0)}`} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#718096" tick={{ fill: '#718096', fontSize: 12 }} domain={['auto', 'auto']} tickFormatter={(val) => `₹${val.toFixed(0)}`} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a202c', borderColor: '#4a5568', borderRadius: '8px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                  formatter={(value, name) => [`₹${value.toFixed(2)}`, name]}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                <Area yAxisId="left" type="monotone" name="Gold Price" dataKey="gold_price" stroke="#ffd700" strokeWidth={2} fillOpacity={1} fill="url(#colorGold)" activeDot={{ r: 6, fill: '#ffd700', stroke: '#fff', strokeWidth: 2 }} />
                <Area yAxisId="right" type="monotone" name="Silver Price" dataKey="silver_price" stroke="#c0c0c0" strokeWidth={2} fillOpacity={1} fill="url(#colorSilver)" activeDot={{ r: 6, fill: '#c0c0c0', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="gs-chart-card">
          <h2>Linear Regression (Gold vs Silver)</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={scatterData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" opacity={0.3} />
                <XAxis type="number" dataKey="x" name="Gold Price" domain={['auto', 'auto']} stroke="#ffd700" tick={{ fill: '#ffd700' }} tickFormatter={(val) => `₹${val.toFixed(0)}`} />
                <YAxis type="number" dataKey="y" name="Silver Price" domain={['auto', 'auto']} stroke="#c0c0c0" tick={{ fill: '#c0c0c0' }} tickFormatter={(val) => `₹${val.toFixed(0)}`} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#1a202c', borderColor: '#4a5568', borderRadius: '8px' }}
                  formatter={(value, name) => [`₹${value.toFixed(2)}`, name === 'y' ? 'Silver Price' : (name === 'y_line' ? 'Regression Line' : 'Gold Price')]}
                />
                <Legend iconType="circle" />
                <Scatter name="Daily Prices" dataKey="y" fill="#4299e1" opacity={0.6} />
                <Line name="Regression Line" dataKey="y_line" stroke="#f56565" strokeWidth={3} dot={false} activeDot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoldSilver;
