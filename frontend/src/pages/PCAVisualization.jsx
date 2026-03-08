import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Scatter,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  ReferenceDot,
} from 'recharts';
import { portfolioAPI, stockAPI } from '../services/api';
import './PCAVisualization.css';

function runKMeans2D(points, k, maxIter = 30) {
  if (!points.length) return [];
  const actualK = Math.max(1, Math.min(k, points.length));
  let centroids = points.slice(0, actualK).map((p) => [p.pe_ratio, p.discount]);
  let labels = new Array(points.length).fill(0);

  for (let iter = 0; iter < maxIter; iter += 1) {
    labels = points.map((p) => {
      const dists = centroids.map((c) => Math.hypot(p.pe_ratio - c[0], p.discount - c[1]));
      let minIdx = 0;
      for (let i = 1; i < dists.length; i += 1) {
        if (dists[i] < dists[minIdx]) minIdx = i;
      }
      return minIdx;
    });

    const next = centroids.map((c, idx) => {
      const group = points.filter((_, i) => labels[i] === idx);
      if (!group.length) return c;
      const mx = group.reduce((s, p) => s + p.pe_ratio, 0) / group.length;
      const my = group.reduce((s, p) => s + p.discount, 0) / group.length;
      return [mx, my];
    });

    const changed = next.some((c, idx) => c[0] !== centroids[idx][0] || c[1] !== centroids[idx][1]);
    centroids = next;
    if (!changed) break;
  }

  return labels;
}

const SUB_COLORS = ['#ff7f0e', '#9467bd', '#17becf', '#8c564b'];

function colorName(hex) {
  const map = {
    '#1f77b4': 'Blue',
    '#d62728': 'Red',
    '#2ca02c': 'Green',
    '#9467bd': 'Purple',
    '#ff7f0e': 'Orange',
    '#17becf': 'Cyan',
    '#8c564b': 'Brown',
  };
  return map[(hex || '').toLowerCase()] || (hex || 'Color');
}

const PCAVisualization = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState(null);
  const [k, setK] = useState(3);
  const [plotImage, setPlotImage] = useState('');
  const [meta, setMeta] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedStockSymbol, setSelectedStockSymbol] = useState('');
  const [forecastDays, setForecastDays] = useState(30);
  const [liveRegression, setLiveRegression] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPlot = async (clusters = 3) => {
    try {
      setLoading(true);
      const [portfolioRes, plotRes] = await Promise.all([
        portfolioAPI.getById(id),
        portfolioAPI.getPCAKMeansPlot(id, clusters),
      ]);

      const payload = plotRes.data || {};
      setPortfolio(portfolioRes.data);
      setPlotImage(payload.image_base64 || '');
      setMeta({
        n_clusters: payload.n_clusters,
        total_points: payload.total_points,
        explained_variance_ratio: payload.explained_variance_ratio || [],
        points: payload.points || [],
        cluster_options: payload.cluster_options || [],
      });
      if ((payload.cluster_options || []).length > 0) {
        setSelectedCluster(String(payload.cluster_options[0].cluster));
      } else {
        setSelectedCluster('');
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Error loading PCA cluster plot');
      setPlotImage('');
      setMeta(null);
      setSelectedCluster('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlot(k);
  }, [id]);

  const selectedGroupPoints = useMemo(() => {
    if (!meta || selectedCluster === '') return [];
    const clusterId = Number(selectedCluster);
    return (meta.points || []).filter((p) => Number(p.cluster) === clusterId);
  }, [meta, selectedCluster]);

  const subgroupData = useMemo(() => {
    if (!selectedGroupPoints.length) return [];
    const subK = Math.min(2, selectedGroupPoints.length);
    const labels = runKMeans2D(selectedGroupPoints, subK);
    return selectedGroupPoints.map((p, idx) => ({
      ...p,
      sub_cluster: labels[idx] || 0,
      x: Number(p.discount),
      y: Number(p.pe_ratio),
    }));
  }, [selectedGroupPoints]);

  const selectedClusterColor = useMemo(() => {
    const option = (meta?.cluster_options || []).find((opt) => String(opt.cluster) === String(selectedCluster));
    return option?.color || '#000000';
  }, [meta, selectedCluster]);

  useEffect(() => {
    if (subgroupData.length > 0) {
      setSelectedStockSymbol(subgroupData[0].symbol);
    } else {
      setSelectedStockSymbol('');
    }
  }, [selectedCluster, subgroupData.length]);

  const selectedStockEntry = useMemo(
    () => subgroupData.find((p) => p.symbol === selectedStockSymbol) || null,
    [subgroupData, selectedStockSymbol],
  );

  useEffect(() => {
    async function loadSelectedStockHistory() {
      if (!selectedStockEntry?.stock_id) {
        setLiveRegression(null);
        return;
      }
      try {
        setHistoryLoading(true);
        const res = await stockAPI.getLiveRegression(selectedStockEntry.stock_id, 180, forecastDays);
        setLiveRegression(res.data || null);
      } catch (e) {
        console.error('Failed to load stock price history for regression', e);
        setLiveRegression(null);
      } finally {
        setHistoryLoading(false);
      }
    }
    loadSelectedStockHistory();
  }, [selectedStockEntry?.stock_id, forecastDays]);

  const timeRegressionData = useMemo(() => {
    if (!liveRegression) return [];
    const historical = (liveRegression.historical_data || []).map((p) => ({
      date: p.date,
      actual_price: Number(p.actual_price),
      regression_price: Number(p.regression_price),
      forecast_price: null,
    }));
    const future = (liveRegression.future_predictions || []).map((p) => ({
      date: p.date,
      actual_price: null,
      regression_price: null,
      forecast_price: Number(p.forecast_price),
    }));
    return [...historical, ...future];
  }, [liveRegression]);

  const forecastEndPoint = useMemo(() => {
    if (!timeRegressionData.length) return null;
    const future = timeRegressionData.filter((p) => p.forecast_price !== null);
    return future.length ? future[future.length - 1] : null;
  }, [timeRegressionData]);

  const renderPointWithName = (props) => {
    const { cx, cy, payload } = props;
    const x = Number(cx);
    const y = Number(cy);
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
    const color = SUB_COLORS[(payload?.sub_cluster || 0) % SUB_COLORS.length];
    const label = payload?.symbol || payload?.name || '';
    return (
      <g>
        <circle cx={x} cy={y} r={5} fill={color} />
        <text x={x + 7} y={y - 7} fontSize={10} fill="#222">
          {label}
        </text>
      </g>
    );
  };

  if (loading) {
    return <div className="loading">Loading PCA analysis...</div>;
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

  return (
    <div className="pca-visualization-container">
      <div className="pca-header">
        <button className="btn btn-secondary" onClick={() => navigate(`/portfolio/${id}`)}>
          Back to Portfolio
        </button>
        <h1>PCA + KMeans Clustering: {portfolio?.name}</h1>
        <p className="subtitle">Matplotlib cluster view generated from backend</p>
      </div>

      <div className="pca-content">
        <div className="pca-chart-section">
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>Stock Distribution (PC1 vs PC2)</h2>
              {meta && (
                <p className="chart-info">
                  Points: {meta.total_points}, Clusters: {meta.n_clusters}, Variance: {' '}
                  {meta.explained_variance_ratio.map((v) => `${(v * 100).toFixed(1)}%`).join(' + ')}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label htmlFor="k-select">K</label>
              <input
                id="k-select"
                type="number"
                min={2}
                max={10}
                value={k}
                onChange={(e) => setK(Number(e.target.value))}
                style={{ width: 70 }}
              />
              <button className="btn btn-primary" onClick={() => loadPlot(k)}>
                Refresh Plot
              </button>
            </div>
          </div>

          {plotImage ? (
            <img
              src={`data:image/png;base64,${plotImage}`}
              alt="PCA KMeans cluster plot"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8 }}
            />
          ) : (
            <div className="empty-chart-state">
              <p>No plot returned for this portfolio.</p>
            </div>
          )}
        </div>

        <div className="pca-chart-section" style={{ marginTop: 20 }}>
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Discount vs PE Ratio (Selected Cluster Re-KMeans)</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="cluster-select">Cluster Group</label>
              <span
                title={selectedClusterColor}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  backgroundColor: selectedClusterColor,
                  display: 'inline-block',
                  border: '1px solid #666',
                }}
              />
              <select
                id="cluster-select"
                value={selectedCluster}
                onChange={(e) => setSelectedCluster(e.target.value)}
              >
                {(meta?.cluster_options || []).map((opt) => (
                  <option key={opt.cluster} value={String(opt.cluster)}>
                    {colorName(opt.color)} Group
                  </option>
                ))}
              </select>
            </div>
          </div>

          {subgroupData.length > 0 ? (
            <div style={{ width: '100%', height: 420 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="Discount %" label={{ value: 'Discount %', position: 'insideBottom', offset: -5 }} />
                  <YAxis type="number" dataKey="y" name="PE Ratio" label={{ value: 'PE Ratio', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value) => Number(value).toFixed(2)}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || payload?.[0]?.payload?.symbol || ''}
                  />
                  <Legend />
                  <Scatter name="Selected Group" data={subgroupData} shape={renderPointWithName} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-chart-state">
              <p>Not enough points in selected group to run sub-clustering.</p>
            </div>
          )}
        </div>

        <div className="pca-chart-section" style={{ marginTop: 20 }}>
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Linear Regression (Time vs Stock Price)</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label htmlFor="stock-select">Stock</label>
              <select
                id="stock-select"
                value={selectedStockSymbol}
                onChange={(e) => setSelectedStockSymbol(e.target.value)}
              >
                {subgroupData.map((p) => (
                  <option key={p.symbol} value={p.symbol}>
                    {p.symbol}
                  </option>
                ))}
              </select>
              <label htmlFor="forecast-days">Forecast Days</label>
              <input
                id="forecast-days"
                type="range"
                min={7}
                max={90}
                step={1}
                value={forecastDays}
                onChange={(e) => setForecastDays(Number(e.target.value))}
              />
              <span>{forecastDays}d</span>
            </div>
          </div>

          {historyLoading ? (
            <div className="loading">Loading stock price history...</div>
          ) : timeRegressionData.length > 1 ? (
            <div style={{ width: '100%', height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeRegressionData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" name="Time" minTickGap={28} label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                  <YAxis name="Price" label={{ value: 'Stock Price', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    formatter={(value, key) => {
                      if (value === null || value === undefined) return ['', ''];
                      if (key === 'regression_price') return [Number(value).toFixed(2), 'Regression Fit'];
                      if (key === 'forecast_price') return [Number(value).toFixed(2), 'Forecast Price'];
                      return [Number(value).toFixed(2), 'Actual Price'];
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="actual_price"
                    stroke="#1f77b4"
                    strokeWidth={2}
                    dot={false}
                    name="Actual Price"
                  />
                  <Line
                    type="monotone"
                    dataKey="regression_price"
                    stroke="#d62728"
                    strokeWidth={2}
                    dot={false}
                    name="Regression Line"
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast_price"
                    stroke="#2ca02c"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    name="Forecast"
                  />
                  {forecastEndPoint && (
                    <ReferenceDot
                      x={forecastEndPoint.date}
                      y={forecastEndPoint.forecast_price}
                      r={7}
                      fill="#2ca02c"
                      stroke="#0a7a27"
                      strokeWidth={2}
                      label={{ value: 'Forecast ->', position: 'right', fill: '#0a7a27' }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-chart-state">
              <p>Need at least 2 historical price points to draw time-based linear regression.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PCAVisualization;
