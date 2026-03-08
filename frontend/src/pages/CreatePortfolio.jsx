import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioAPI } from '../services/api';
import './CreatePortfolio.css';

const CreatePortfolio = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Portfolio name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await portfolioAPI.create(formData);
      navigate(`/portfolio/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating portfolio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-portfolio-container">
      <div className="form-wrapper">
        <h1>Create New Portfolio</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Portfolio Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., My Investment Portfolio"
              maxLength="255"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description for your portfolio"
              rows="4"
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create Portfolio'}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePortfolio;
