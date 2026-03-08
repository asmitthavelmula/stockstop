import React, { useState } from 'react';
import { portfolioAPI } from '../services/api';
import './PortfolioClustering.css';

const PortfolioClustering = ({ portfolioId }) => {
  const [k, setK] = useState(3);
  const [plotData, setPlotData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runClustering = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await portfolioAPI.getPCAKMeansPlot(portfolioId, k);
      setPlotData(response.data);
    } catch (err) {
      console.error('Error running K-Means clustering:', err);
      setError(err.response?.data?.error || 'Failed to generate clustering plot. Ensure the portfolio has at least 2 stocks.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portfolio-clustering-container">
      <h3>Portfolio Stock Clustering (PCA + K-Means)</h3>
      <p className="description">
        This analysis groups your stocks into <strong>{k} clusters</strong> based on their P/E Ratio, 
        Discount from 52W High, Opportunity Score, and Current Price. 
        PCA is used to reduce these features into 2D for visualization.
      </p>

      <div className="clustering-controls">
        <div className="control-group">
          <label htmlFor="k-select">Select Clusters (K):</label>
          <select 
            id="k-select" 
            value={k} 
            onChange={(e) => setK(parseInt(e.target.value))}
            disabled={loading}
          >
            {[2, 3, 4, 5].map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>
        <button 
          className="run-clustering-btn" 
          onClick={runClustering} 
          disabled={loading}
        >
          {loading ? 'Running Analysis...' : 'Run K-Means Clustering'}
        </button>
      </div>

      {error && <div className="clustering-error">{error}</div>}

      {loading && (
        <div className="clustering-loading">
          <div className="spinner"></div>
          <p>Processing features and generating plot...</p>
        </div>
      )}

      {plotData && !loading && (
        <div className="clustering-result">
          <div className="plot-container">
            <img 
              src={`data:image/png;base64,${plotData.image_base64}`} 
              alt="K-Means Clustering Plot" 
              className="clustering-plot"
            />
          </div>
          
          <div className="cluster-legend">
            <h4>Cluster Distribution</h4>
            <div className="legend-items">
              {plotData.cluster_options.map(opt => (
                <div key={opt.cluster} className="legend-item">
                  <span 
                    className="color-box" 
                    style={{ backgroundColor: opt.color }}
                  ></span>
                  <span className="label">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="cluster-details-table">
            <h4>Stock Groupings</h4>
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Cluster</th>
                </tr>
              </thead>
              <tbody>
                {plotData.points.map((point, idx) => (
                  <tr key={idx}>
                    <td><strong>{point.symbol}</strong></td>
                    <td>{point.name}</td>
                    <td>
                      <span 
                        className="cluster-badge" 
                        style={{ backgroundColor: point.cluster_color }}
                      >
                        Cluster {point.cluster + 1}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioClustering;
