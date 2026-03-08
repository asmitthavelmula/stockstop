import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './Clustering.css';

const API_BASE_URL = 'http://localhost:8000/api';
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#a28fd0'];

export default function Clustering() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [features, setFeatures] = useState({
    'P/E Ratio': true,
    'Discount from 1Y High': true,
    '1 Month Return': false,
    '3 Month Return': false,
    '6 Month Return': false,
    'LTP / 1Y High Ratio': false,
  });

  const [k, setK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [clusterData, setClusterData] = useState([]);
  const [totalStocks, setTotalStocks] = useState(0);

  const handleFeatureChange = (feat) => {
    setFeatures(prev => ({ ...prev, [feat]: !prev[feat] }));
  };

  const handleRunClustering = async () => {
    const selectedFeatures = Object.keys(features).filter(f => features[f]);
    if (selectedFeatures.length === 0) {
      setError('Please select at least one feature to cluster on.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg('');

    try {
      const response = await axios.post(`${API_BASE_URL}/portfolios/${id}/run_pca_clustering/`, {
        features: selectedFeatures,
        k: k
      });

      const resData = response.data;
      setClusterData(resData.points);
      setTotalStocks(resData.total_stocks);
      setSuccessMsg(`Successfully clustered ${resData.total_stocks} stocks into ${resData.k} clusters`);
    } catch (err) {
      console.error('Error running clustering:', err);
      setError(err.response?.data?.error || 'Failed to run clustering engine.');
    } finally {
      setLoading(false);
    }
  };

  // Group data by clusters to render discrete Scatters so we can use Custom Legends mapped to clusters
  const groups = {};
  clusterData.forEach(d => {
    if (!groups[d.cluster]) groups[d.cluster] = [];
    groups[d.cluster].push(d);
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="pca-tooltip">
          <p className="pca-tooltip-title">{data.symbol}</p>
          <p className="pca-tooltip-desc">{data.name}</p>
          <p className="pca-tooltip-coord">PCA 1: {data.pca_x?.toFixed(4)}</p>
          <p className="pca-tooltip-coord">PCA 2: {data.pca_y?.toFixed(4)}</p>
          <p className="pca-tooltip-cluster">Cluster: {data.cluster}</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (props) => {
    const { x, y, symbol } = props;
    if (!x || !y) return null;
    return (
      <text x={x} y={y + 12} fill="#666" fontSize="10" textAnchor="middle" className="pca-node-label">
        {symbol}
      </text>
    );
  };

  return (
    <div className="pca-clustering-page">
      <div className="pca-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Portfolio Clustering Engine</h1>
      </div>

      <div className="pca-main-grid">

        {/* Left Control Panel */}
        <div className="pca-control-panel">
          <div className="panel-header">
            <h3>📈 Portfolio Clustering Engine</h3>
          </div>

          <div className="panel-section">
            <label className="section-label">Select Features</label>
            <div className="features-grid">
              {Object.keys(features).map(feat => (
                <label key={feat} className="feature-checkbox">
                  <input
                    type="checkbox"
                    checked={features[feat]}
                    onChange={() => handleFeatureChange(feat)}
                  />
                  <span>{feat}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <label className="section-label">Number of Clusters (K): {k}</label>
            <input
              type="range"
              min="2"
              max="6"
              value={k}
              onChange={(e) => setK(parseInt(e.target.value))}
              className="k-slider"
            />
            <div className="slider-marks">
              <span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
            </div>
          </div>

          <button
            className="btn-run-clustering"
            onClick={handleRunClustering}
            disabled={loading}
          >
            {loading ? 'Running...' : '🚀 Run Clustering'}
          </button>

          {error && <div className="alert-box error">{error}</div>}
          {successMsg && <div className="alert-box success">{successMsg}</div>}
        </div>

        {/* Right Visualization Panel */}
        <div className="pca-visualization-panel">
          <div className="panel-header">
            <h3>Stock Clusters (PCA Visualization)</h3>
            <p>Click "Run Clustering" to visualize stock clusters dimensionality-reduced to X and Y coordinates.</p>
          </div>

          <div className="pca-chart-container">
            {clusterData.length > 0 ? (
              <ResponsiveContainer width="100%" height={450}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis
                    type="number"
                    dataKey="pca_x"
                    name="PCA Component 1"
                    label={{ value: "PCA Component 1", position: "bottom", offset: 0, fill: "#666" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="pca_y"
                    name="PCA Component 2"
                    label={{ value: "PCA Component 2", angle: -90, position: "left", fill: "#666" }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                  {/* Legend to map colors to clusters */}
                  <div className="pca-custom-legend">
                    {Object.keys(groups).map((clusterId, index) => (
                      <span key={clusterId} className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        Cluster {clusterId}
                      </span>
                    ))}
                  </div>

                  {Object.keys(groups).map((clusterId, index) => (
                    <Scatter
                      key={clusterId}
                      name={`Cluster ${clusterId}`}
                      data={groups[clusterId]}
                      fill={COLORS[index % COLORS.length]}
                    >
                      {groups[clusterId].map((entry, index) => (
                        <Cell key={`cell-${index}`} />
                      ))}
                      {/* Attach specific label list onto this scatter group */}
                      {groups[clusterId].map((entry, index) => renderCustomLabel({ x: entry.pca_x, y: entry.pca_y, symbol: entry.symbol }))}
                    </Scatter>
                  ))}

                  {/* Render the actual scatter dots */}
                  <Scatter data={clusterData} fill="#8884d8" shape="circle">
                    {clusterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.cluster % COLORS.length]} />
                    ))}
                  </Scatter>

                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart-state">
                <p>No clusters generated yet. Configure the engine and run it.</p>
              </div>
            )}

            {clusterData.length > 0 && (
              <div className="pca-chart-legends">
                {Object.keys(groups).map((clusterId, idx) => (
                  <div key={clusterId} className="pca-legend-pill">
                    <span className="color-box" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    Cluster {parseInt(clusterId) + 1}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
