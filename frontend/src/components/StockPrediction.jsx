import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { stockAPI } from '../services/api';
import './StockPrediction.css';

const StockPrediction = ({ stocks }) => {
  const [selectedStockId, setSelectedStockId] = useState('');
  const [selectedModel, setSelectedModel] = useState('linear');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [predictionData, setPredictionData] = useState(null);

  const models = [
    { value: 'linear', label: 'Linear Regression' },
    { value: 'logistic', label: 'Logistic Regression' },
    { value: 'arima', label: 'Time Series ARIMA' },
    { value: 'rnn', label: 'RNN (Recurrent Neural Network)' },
  ];

  const handlePredict = async () => {
    if (!selectedStockId) {
      setError('Please select a stock first.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      // Requirements: past_days=180, forecast_days=7, dynamic model selection
      const response = await stockAPI.getLiveRegression(selectedStockId, 180, 7, selectedModel);
      
      const { historical_dates, historical_prices, forecast_dates, forecast_prices } = response.data;
      
      // Combine data for charting
      const formattedData = [
        ...historical_dates.map((date, idx) => ({
          date,
          price: historical_prices[idx],
          type: 'historical'
        })),
        ...forecast_dates.map((date, idx) => ({
          date,
          prediction: forecast_prices[idx],
          type: 'forecast'
        }))
      ];

      setPredictionData(formattedData);
    } catch (err) {
      console.error('Error fetching prediction:', err);
      setError(err.response?.data?.error || 'Failed to fetch prediction data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stock-prediction-container">
      <h3>Stock Price Prediction (7 Days)</h3>
      
      <div className="prediction-controls">
        <select 
          value={selectedStockId} 
          onChange={(e) => setSelectedStockId(e.target.value)}
          disabled={loading}
          className="stock-select"
        >
          <option value="">-- Select Stock --</option>
          {stocks.map(stock => (
            <option key={stock.id} value={stock.id}>
              {stock.company_symbol} - {stock.company_name}
            </option>
          ))}
        </select>

        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={loading}
          className="model-select"
        >
          {models.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        
        <button 
          onClick={handlePredict} 
          disabled={loading}
          className="predict-btn"
        >
          {loading ? 'Analyzing...' : 'Predict Next 7 Days'}
        </button>
      </div>

      {error && <div className="prediction-error">{error}</div>}

      {loading && (
        <div className="prediction-loading">
          <div className="spinner"></div>
          <p>Running Linear Regression analysis...</p>
        </div>
      )}

      {predictionData && !loading && (
        <div className="prediction-graph-container">
          <h4>
            7-Day Price Prediction ({models.find(m => m.value === selectedModel)?.label})
          </h4>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <ComposedChart data={predictionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  minTickGap={30}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `₹${val.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(val) => [`₹${val.toLocaleString()}`, 'Price']}
                  labelStyle={{ fontWeight: 'bold', color: '#333' }}
                />
                <Legend verticalAlign="top" height={36}/>
                
                {/* Historical Price - Solid Blue Line */}
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#3182ce" 
                  strokeWidth={2} 
                  dot={false} 
                  name="Historical Price"
                  connectNulls
                />
                
                {/* Predicted Price - Red Dashed Line */}
                <Line 
                  type="monotone" 
                  dataKey="prediction" 
                  stroke="#e53e3e" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  dot={false} 
                  name="Predicted Price (7D)"
                  connectNulls
                />

                {/* Vertical line at the split point */}
                <ReferenceLine 
                  x={predictionData.find(d => d.type === 'forecast')?.date} 
                  stroke="#666" 
                  strokeDasharray="3 3"
                  label={{ value: 'Forecast Start', position: 'top', fontSize: 10, fill: '#666' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="prediction-disclaimer">
            * Disclaimer: Predictions are based on historical price trends using linear regression and may not accurately reflect future market behavior.
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPrediction;
