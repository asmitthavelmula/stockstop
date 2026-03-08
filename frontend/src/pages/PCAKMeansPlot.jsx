import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

const PCAKMeansPlot = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clusters, setClusters] = useState(3);
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPlot = async (k) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/portfolios/${id}/pca-kmeans-plot/?k=${k}`);
      setImageBase64(response.data.image_base64 || '');
    } catch (err) {
      setImageBase64('');
      setError(err.response?.data?.error || 'Unable to load clustering plot.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlot(clusters);
  }, [id]);

  const handleRefresh = () => {
    fetchPlot(clusters);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn btn-secondary" onClick={() => navigate(`/portfolio/${id}`)}>
          Back to Portfolio
        </button>
        <h2 style={{ margin: 0 }}>PCA + KMeans Cluster Plot</h2>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label htmlFor="clusters">Clusters (k)</label>
        <input
          id="clusters"
          type="number"
          min={2}
          max={10}
          value={clusters}
          onChange={(e) => setClusters(Number(e.target.value))}
          style={{ width: 80 }}
        />
        <button className="btn btn-primary" onClick={handleRefresh} disabled={loading}>
          {loading ? 'Loading...' : 'Generate Plot'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!error && imageBase64 && (
        <img
          src={`data:image/png;base64,${imageBase64}`}
          alt="PCA KMeans clustering scatter plot"
          style={{ width: '100%', borderRadius: 8, border: '1px solid #ddd' }}
        />
      )}
    </div>
  );
};

export default PCAKMeansPlot;
