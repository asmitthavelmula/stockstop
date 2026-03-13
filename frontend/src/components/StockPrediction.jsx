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
import { stockAPI, fetchLiveData } from '../services/api';
import './StockPrediction.css';

const StockPrediction = ({ stocks }) => {
  const [selectedStockId, setSelectedStockId] = useState('');
  const [selectedModel, setSelectedModel] = useState('linear');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [predictionData, setPredictionData] = useState(null);
  const [liveQuote, setLiveQuote] = useState(null);

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

    const selectedStock = stocks.find(s => s.id.toString() === selectedStockId.toString());
    const symbol = selectedStock?.company_symbol || 'AAPL';

    try {
      setLoading(true);
      setError('');
      
      // 1. Fetch live data for validation first (2026-compatible utility)
      try {
        const quote = await fetchLiveData(symbol);
        setLiveQuote(quote);
      } catch (liveErr) {
        console.warn('Live quote fetch failed, continuing with cached backend data...', liveErr);
      }

      // 2. Perform the actual prediction regression
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
      const msg = err.response?.data?.error || err.message;
      if (msg.includes('Insufficient live data')) {
        setError('Insufficient market data for this stock to generate a 7-day prediction. Try again later or choose another stock.');
      } else if (msg.includes('network') || !err.response) {
        setError('Cannot connect to the analysis server. Please ensure the backend is running on port 8001.');
      } else {
        setError(`Failed to fetch prediction: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stock-prediction-container">
      <h3>Stock Price Prediction (7 Days)</h3>
      
      {liveQuote && (
        <div className="live-quote-bar">
          <span className="live-symbol">{liveQuote.symbol}</span>
          <span className="live-price">₹{liveQuote.price.toFixed(2)}</span>
          <span className={`live-change ${liveQuote.change >= 0 ? 'positive' : 'negative'}`}>
            {liveQuote.change >= 0 ? '+' : ''}{liveQuote.change.toFixed(2)} ({liveQuote.change_percent})
          </span>
          <small className="last-updated">Updated: {liveQuote.last_updated}</small>
        </div>
      )}
      
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
