import React, { useState } from 'react';
import { companyAPI } from '../services/api';
import './StockForm.css';

const StockForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    quantity: '',
    purchase_price: '',
    purchase_date: '',
  });

  const [companyInfo, setCompanyInfo] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSymbolChange = (e) => {
    const symbol = e.target.value.toUpperCase();
    setFormData(prev => ({
      ...prev,
      symbol
    }));
    setCompanyInfo(null);
    setSearchError('');
  };

  const handleSearchStock = async () => {
    if (!formData.symbol.trim()) {
      setSearchError('Please enter a stock symbol');
      return;
    }

    setSearching(true);
    try {
      const response = await companyAPI.search(formData.symbol);
      setCompanyInfo(response.data);
      if (!formData.purchase_price) {
        setFormData(prev => ({
          ...prev,
          purchase_price: response.data.current_price
        }));
      }
      setSearchError('');
    } catch (err) {
      setSearchError('Stock not found. Please check the symbol.');
      setCompanyInfo(null);
    } finally {
      setSearching(false);
    }
  };

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

    if (!formData.symbol || !formData.quantity || !formData.purchase_price || !formData.purchase_date) {
      setError('All fields are required');
      return;
    }

    setSubmitLoading(true);
    try {
      await onSubmit({
        symbol: formData.symbol,
        quantity: parseInt(formData.quantity),
        purchase_price: parseFloat(formData.purchase_price),
        purchase_date: formData.purchase_date,
      });

      // Reset form
      setFormData({
        symbol: '',
        quantity: '',
        purchase_price: '',
        purchase_date: '',
      });
      setCompanyInfo(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error adding stock');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <form className="stock-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Search Stock</h3>
        
        <div className="form-group">
          <label htmlFor="symbol">Stock Symbol *</label>
          <div className="search-group">
            <input
              type="text"
              id="symbol"
              name="symbol"
              value={formData.symbol}
              onChange={handleSymbolChange}
              placeholder="e.g., AAPL, GOOGL, MSFT"
              maxLength="10"
            />
            <button 
              type="button"
              className="btn-search"
              onClick={handleSearchStock}
              disabled={searching}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {searchError && <span className="error-text">{searchError}</span>}
        </div>

        {companyInfo && (
          <div className="company-info">
            <div className="info-item">
              <span className="label">{companyInfo.name}</span>
              <span className="detail">{companyInfo.sector}</span>
            </div>
            <div className="info-item">
              <span className="label">Current Price</span>
              <span className="detail">${parseFloat(companyInfo.current_price).toFixed(2)}</span>
            </div>
            {companyInfo.pe_ratio && (
              <div className="info-item">
                <span className="label">P/E Ratio</span>
                <span className="detail">{companyInfo.pe_ratio.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="form-section">
        <h3>Stock Details</h3>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="quantity">Quantity *</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="Number of shares"
              min="1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="purchase_price">Purchase Price ($) *</label>
            <input
              type="number"
              id="purchase_price"
              name="purchase_price"
              value={formData.purchase_price}
              onChange={handleChange}
              placeholder="Price per share"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="purchase_date">Purchase Date *</label>
          <input
            type="date"
            id="purchase_date"
            name="purchase_date"
            value={formData.purchase_date}
            onChange={handleChange}
          />
        </div>

        {formData.quantity && formData.purchase_price && (
          <div className="cost-summary">
            <span className="label">Total Cost:</span>
            <span className="value">
              ${(parseFloat(formData.quantity) * parseFloat(formData.purchase_price)).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button 
          type="submit"
          className="btn btn-primary"
          disabled={submitLoading}
        >
          {submitLoading ? 'Adding Stock...' : 'Add Stock'}
        </button>
      </div>
    </form>
  );
};

export default StockForm;
