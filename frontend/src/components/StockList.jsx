import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioAPI } from '../services/api';
import './StockList.css';

const StockList = ({ stocks, onAnalyze, onDelete, analyzing, inrIndex = {} }) => {
  const navigate = useNavigate();
  const [expandedStock, setExpandedStock] = useState(null);
  const [analysisDays, setAnalysisDays] = useState({});

  const handleAnalyzeClick = (stockId) => {
    const days = analysisDays[stockId] || 365;
    onAnalyze(stockId, days);
  };

  const handleViewAnalysis = (stockId) => {
    navigate(`/stock/${stockId}/analysis`);
  };

  return (
    <div className="stock-list">
      <table className="stocks-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Company</th>
            <th>Quantity</th>
            <th>Purchase Price (₹)</th>
            <th>Current Price (₹)</th>
            <th>Current Value (₹)</th>
            <th>Gain/Loss (₹)</th>
            <th>Gain/Loss %</th>
            <th>PE Min</th>
            <th>PE Max</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => (
            <React.Fragment key={stock.id}>
              <tr className={`stock-row ${expandedStock === stock.id ? 'expanded' : ''}`}>
                <td className="symbol-cell">
                  <strong>{stock.company_symbol}</strong>
                </td>
                <td>{stock.company_name}</td>
                <td>{stock.quantity}</td>
                <td>₹{(() => {
                  const idx = inrIndex[stock.company_symbol];
                  const v = idx ? idx.purchase_price_inr : parseFloat(stock.purchase_price);
                  return Number(v || 0).toFixed(2);
                })()}</td>
                <td>₹{(() => {
                  const idx = inrIndex[stock.company_symbol];
                  const v = idx ? idx.current_price_inr : parseFloat(stock.current_price);
                  return Number(v || 0).toFixed(2);
                })()}</td>
                <td className="value-cell">₹{(() => {
                  const idx = inrIndex[stock.company_symbol];
                  const v = idx ? idx.current_value_inr : parseFloat(stock.current_value);
                  return Number(v || 0).toFixed(2);
                })()}</td>
                <td className={`gain-loss ${(() => {
                  const idx = inrIndex[stock.company_symbol];
                  const qty = Number(stock.quantity || 0);
                  const purch = idx ? Number(idx.purchase_price_inr || 0) : Number(stock.purchase_price || 0);
                  const curVal = idx ? Number(idx.current_value_inr || 0) : Number(stock.current_value || 0);
                  const gain = curVal - qty * purch;
                  return gain >= 0 ? 'positive' : 'negative';
                })()}`}>
                  {(() => {
                    const idx = inrIndex[stock.company_symbol];
                    const qty = Number(stock.quantity || 0);
                    const purch = idx ? Number(idx.purchase_price_inr || 0) : Number(stock.purchase_price || 0);
                    const curVal = idx ? Number(idx.current_value_inr || 0) : Number(stock.current_value || 0);
                    const gain = curVal - qty * purch;
                    return `₹${gain.toFixed(2)}`;
                  })()}
                </td>
                <td className={`gain-loss-percentage ${(() => {
                  const idx = inrIndex[stock.company_symbol];
                  const qty = Number(stock.quantity || 0);
                  const purch = idx ? Number(idx.purchase_price_inr || 0) : Number(stock.purchase_price || 0);
                  const curVal = idx ? Number(idx.current_value_inr || 0) : Number(stock.current_value || 0);
                  const gain = curVal - qty * purch;
                  const pct = purch === 0 ? 0 : (gain / (qty * purch)) * 100;
                  return pct >= 0 ? 'positive' : 'negative';
                })()}`}>
                  {(() => {
                    const idx = inrIndex[stock.company_symbol];
                    const qty = Number(stock.quantity || 0);
                    const purch = idx ? Number(idx.purchase_price_inr || 0) : Number(stock.purchase_price || 0);
                    const curVal = idx ? Number(idx.current_value_inr || 0) : Number(stock.current_value || 0);
                    const gain = curVal - qty * purch;
                    const pct = purch === 0 ? 0 : (gain / (qty * purch)) * 100;
                    return `${pct.toFixed(2)}%`;
                  })()}
                </td>
                <td>{stock.pe_ratio_min !== null && stock.pe_ratio_min !== undefined ? parseFloat(stock.pe_ratio_min).toFixed(2) : '—'}</td>
                <td>{stock.pe_ratio_max !== null && stock.pe_ratio_max !== undefined ? parseFloat(stock.pe_ratio_max).toFixed(2) : '—'}</td>
                <td className="actions-cell">
                  <button 
                    className="btn-action btn-analyze"
                    onClick={() => setExpandedStock(expandedStock === stock.id ? null : stock.id)}
                    title="Analyze"
                  >
                    📊
                  </button>
                  <button 
                    className="btn-action btn-delete"
                    onClick={() => onDelete(stock.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </td>
              </tr>

              {expandedStock === stock.id && (
                <tr className="expanded-row">
                  <td colSpan="11">
                    <div className="expand-content">
                      <div className="analysis-section">
                        <h4>Stock Analysis</h4>
                        <p>Analyze historical data to get insights about this stock</p>

                        <div className="analysis-form">
                          <div className="form-group">
                            <label>Past Data Period (days):</label>
                            <div className="days-options">
                              {[30, 90, 180, 365].map(days => (
                                <button
                                  key={days}
                                  type="button"
                                  className={`days-btn ${analysisDays[stock.id] === days || (analysisDays[stock.id] === undefined && days === 365) ? 'active' : ''}`}
                                  onClick={() => setAnalysisDays(prev => ({ ...prev, [stock.id]: days }))}
                                >
                                  {days}D
                                </button>
                              ))}
                              <input
                                type="number"
                                placeholder="Custom"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    setAnalysisDays(prev => ({ ...prev, [stock.id]: parseInt(e.target.value) }));
                                  }
                                }}
                                min="1"
                                max="1000"
                              />
                            </div>
                          </div>

                          <div className="button-group">
                            <button
                              className="btn btn-analyze-submit"
                              onClick={() => handleAnalyzeClick(stock.id)}
                              disabled={analyzing === stock.id}
                            >
                              {analyzing === stock.id ? 'Analyzing...' : 'Start Analysis'}
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={async () => {
                                try {
                                  await portfolioAPI.addCompanyToPortfolioByName('My Portfolio', stock.company_symbol, { current_price: stock.current_price });
                                  alert('Added to My Portfolio');
                                } catch (e) {
                                  console.error(e);
                                  alert('Error adding to My Portfolio');
                                }
                              }}
                            >
                              + Add to My Portfolio
                            </button>
                          </div>
                        </div>

                        {/* Show link to view latest analysis if available */}
                        <div className="analysis-footer">
                          <button
                            className="btn-view-analysis"
                            onClick={() => handleViewAnalysis(stock.id)}
                          >
                            View Analysis Results →
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {stocks.length === 0 && (
        <div className="empty-state">
          <p>No stocks in this portfolio</p>
        </div>
      )}
    </div>
  );
};

export default StockList;
