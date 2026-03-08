 import React, { useEffect, useState } from 'react'
 import { useParams, useNavigate } from 'react-router-dom'
 import { stockAPI } from '../services/api'
 import ChartCard from '../components/ChartCard'
 import './StockAnalysis.css'

export default function StockAnalysis() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState(null)
  const [priceHistory, setPriceHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await stockAPI.getLatestAnalysis(id)
        console.log('✓ Fetched analysis:', res.data)
        if (!res.data || !res.data.id) {
          throw new Error('Invalid analysis response')
        }
        setAnalysis(res.data)
      } catch (e) {
        try {
          await stockAPI.analyze(id, 365)
          const res2 = await stockAPI.getLatestAnalysis(id)
          setAnalysis(res2.data)
        } catch (err2) {
          console.error('✗ Failed to fetch analysis:', e.message, e.response?.data)
          setError('Please analyze this stock before viewing results.')
          setAnalysis(null)
        }
      }
      try {
        const ph = await stockAPI.getPriceHistory(id)
        console.log('✓ Fetched price history:', ph.data)
        setPriceHistory((ph.data && ph.data.prices) || (ph.data || []))
      } catch (err) {
        console.error('✗ Failed to fetch price history:', err.message)
        setPriceHistory([])
      }
      setLoading(false)
    }
    load()
  }, [id, retryCount])

  const handleRefresh = () => {
    setRetryCount(retryCount + 1)
    setLoading(true)
    setError('')
    setAnalysis(null)
  }

  if (loading) return <div className="loading">Loading analysis...</div>
  if (error || !analysis) return (
    <div className="error-container">
      <p>{error || 'Analysis data not found'}</p>
      <div className="error-buttons">
        <button onClick={() => navigate(-1)}>Go Back</button>
        <button onClick={handleRefresh} className="btn-refresh">Refresh</button>
      </div>
    </div>
  )

  const peRatioData = [
    { name: 'Current', value: analysis.pe_ratio_current || 0 },
    { name: 'Average', value: analysis.pe_ratio_average || 0 },
    { name: 'Min', value: analysis.pe_ratio_min || 0 },
    { name: 'Max', value: analysis.pe_ratio_max || 0 },
  ]

  const discountData = [
    {
      name: 'Fair Value',
      current: parseFloat(analysis.current_price),
      fair: parseFloat(analysis.fair_value) || 0,
    }
  ]

  const opportunityData = [
    { name: 'Opportunity Score', value: analysis.opportunity_score || 0, fill: '#8884d8' }
  ]

  const priceHistoryData = Array.isArray(priceHistory) ? priceHistory : (priceHistory?.prices || [])

  return (
    <div className="stock-analysis-container">
      <div className="analysis-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Go Back
        </button>
        <h1>{analysis.company?.symbol} - Stock Analysis</h1>
        <div
          className="recommendation-badge"
          style={{ background: getRecommendationColor(analysis.recommendation) }}
        >
          {analysis.recommendation.replace('_', ' ')}
        </div>
      </div>

      <div className="analysis-summary">
        <div className="summary-item">
          <span className="label">Current Price</span>
          <span className="value">
            ${parseFloat(analysis.current_price).toFixed(2)}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">Fair Value</span>
          <span className="value">
            ${parseFloat(analysis.fair_value).toFixed(2)}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">Discount %</span>
          <span
            className={`value ${analysis.discount_percentage > 0 ? 'positive' : 'negative'}`}
          >
            {analysis.discount_percentage?.toFixed(2)}%
          </span>
        </div>
        <div className="summary-item">
          <span className="label">Opportunity Score</span>
          <span className="value">
            {analysis.opportunity_score?.toFixed(2)}/100
          </span>
        </div>
      </div>

      <div className="charts-grid">
        <ChartCard
          title="PE Ratio Analysis"
          description="Current, Average, Min, and Max P/E Ratios"
          type="bar"
          data={peRatioData}
          dataKey="value"
          nameKey="name"
        />

        <ChartCard
          title="Current vs Fair Value"
          description="Discount Analysis"
          type="bar"
          data={discountData}
          dataKey1="current"
          dataKey2="fair"
          name1="Current Price"
          name2="Fair Value"
        />

        <ChartCard
          title="Opportunity Score"
          description="Investment Opportunity Assessment (0-100)"
          type="pie"
          data={opportunityData}
          dataKey="value"
          nameKey="name"
        />

        {priceHistoryData.length > 0 && (
          <ChartCard
            title="Price History"
            description={`Last ${analysis.past_days} days`}
            type="line"
            data={priceHistoryData}
            dataKey="price"
            nameKey="date"
            fullWidth={true}
          />
        )}
      </div>

      <div className="analysis-details">
        <h2>Analysis Details</h2>
        <div className="details-grid">
          <div className="detail-item">
            <span className="label">Analysis Date</span>
            <span className="value">
              {new Date(analysis.analysis_date).toLocaleDateString()}
            </span>
          </div>
          <div className="detail-item">
            <span className="label">Data Period</span>
            <span className="value">{analysis.past_days} days</span>
          </div>
          <div className="detail-item">
            <span className="label">Recommendation</span>
            <span className="value">
              {analysis.recommendation.replace('_', ' ')}
            </span>
          </div>
          <div className="detail-item">
            <span className="label">Company</span>
            <span className="value">{analysis.company.name}</span>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button
          className="btn btn-secondary"
          onClick={() => navigate(-1)}
        >
          Back to Stock
        </button>
      </div>
    </div>
  )
}

const getRecommendationColor = (recommendation) => {
  const colors = {
    'STRONG_BUY': '#4caf50',
    'BUY': '#81c784',
    'HOLD': '#ffa726',
    'SELL': '#ef5350',
    'STRONG_SELL': '#c62828',
  };
  return colors[recommendation] || '#999';
};
