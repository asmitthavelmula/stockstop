import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { portfolioAPI, companyAPI } from '../services/api';
import ChartCard from '../components/ChartCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './CombinedAnalytics.css';

export default function CombinedAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [pca, setPca] = useState(null);
  const [reg, setReg] = useState(null);
  const [liveAnalyses, setLiveAnalyses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pastDays, setPastDays] = useState(365);
  const [goldLive, setGoldLive] = useState(null);
  const [silverLive, setSilverLive] = useState(null);
  const [rollWindow, setRollWindow] = useState(30);
  const [asset, setAsset] = useState('BTC-USD');
  const [assetForecast, setAssetForecast] = useState(null);
  const [assetForecastLoading, setAssetForecastLoading] = useState(false);
  const [assetForecastError, setAssetForecastError] = useState('');
  const [assetForecastDays, setAssetForecastDays] = useState(30);
  const [syncing, setSyncing] = useState(false);

  const isCryptoAIPortfolio = (portfolio?.name || '').toLowerCase().includes('crypto ai');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setSyncing(true);
        const [portfolioRes, pcaRes, regRes, liveRes] = await Promise.all([
          portfolioAPI.getById(id, { params: { refresh_prices: 'true' } }),
          portfolioAPI.getPCAAnalysis(id),
          portfolioAPI.getRegressionAnalysis(id, pastDays, 30),
          portfolioAPI.analyzeAllLive(id, 365),
        ]);
        setPortfolio(portfolioRes.data);
        setPca(pcaRes.data);
        setReg(regRes.data);
        setLiveAnalyses(liveRes.data);
        try {
          const [g, s] = await Promise.all([
            companyAPI.search('GLD'),
            companyAPI.search('SLV'),
          ]);
          setGoldLive(g.data);
          setSilverLive(s.data);
        } catch { }
        setError('');
      } catch (e) {
        setError('Error loading analytics');
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    })();
  }, [id, pastDays]);

  useEffect(() => {
    if (!isCryptoAIPortfolio) {
      setAssetForecast(null);
      return;
    }

    (async () => {
      try {
        setAssetForecastLoading(true);
        setAssetForecastError('');
        const res = await portfolioAPI.getAssetForecast(id, asset, 180, assetForecastDays);
        setAssetForecast(res.data);
      } catch (e) {
        setAssetForecast(null);
        setAssetForecastError(e?.response?.data?.error || 'Failed to load asset forecast');
      } finally {
        setAssetForecastLoading(false);
      }
    })();
  }, [id, asset, isCryptoAIPortfolio, assetForecastDays]);

  const buildCorrelationSeries = () => {
    if (!reg || !reg.stocks) return null;
    const gld = reg.stocks.find(s => s.symbol.toUpperCase() === 'GLD');
    const slv = reg.stocks.find(s => s.symbol.toUpperCase() === 'SLV');
    if (!gld || !slv) return null;
    const len = Math.min((gld.historical_data || []).length, (slv.historical_data || []).length);
    const series = [];
    for (let i = 0; i < len; i++) {
      const a = gld.historical_data[i];
      const b = slv.historical_data[i];
      series.push({ date: a.date, GLD: a.price, SLV: b.price });
    }
    return series;
  };
  const buildReturnPairs = () => {
    const ser = buildCorrelationSeries();
    if (!ser || ser.length < 2) return null;
    const pairs = [];
    for (let i = 1; i < ser.length; i++) {
      const prev = ser[i - 1];
      const cur = ser[i];
      const rG = prev.GLD ? ((cur.GLD - prev.GLD) / prev.GLD) * 100 : 0;
      const rS = prev.SLV ? ((cur.SLV - prev.SLV) / prev.SLV) * 100 : 0;
      pairs.push({ name: cur.date, x: rG, y: rS, cluster: 0 });
    }
    return pairs;
  };
  const computeCorrelation = (pairs) => {
    if (!pairs || pairs.length < 2) return null;
    const xs = pairs.map(p => p.x);
    const ys = pairs.map(p => p.y);
    const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
    const mx = mean(xs);
    const my = mean(ys);
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < xs.length; i++) {
      const vx = xs[i] - mx;
      const vy = ys[i] - my;
      num += vx * vy;
      dx += vx * vx;
      dy += vy * vy;
    }
    const denom = Math.sqrt(dx * dy);
    if (!denom) return 0;
    return num / denom;
  };

  if (loading) return <div className="loading">Loading analytics...</div>;
  if (error) return (
    <div className="error-container">
      <p>{error}</p>
      <button onClick={() => navigate(`/portfolio/${id}`)} className="btn btn-secondary">Back</button>
    </div>
  );

  const corrSeries = buildCorrelationSeries();
  const returnPairs = buildReturnPairs();
  const corrCoeff = computeCorrelation(returnPairs);
  const buildRollingCorrelation = (pairs, w) => {
    if (!pairs || pairs.length < w) return null;
    const res = [];
    for (let i = w - 1; i < pairs.length; i++) {
      const slice = pairs.slice(i - w + 1, i + 1);
      const r = computeCorrelation(slice);
      res.push({ date: pairs[i].name, r });
    }
    return res;
  };
  const rollingCorr = buildRollingCorrelation(returnPairs, rollWindow);
  const assetForecastChartData = assetForecast
    ? [
      ...(assetForecast.historical_data || []).map((d) => ({
        date: d.date,
        historical_price: d.actual_price,
        forecast_price: null,
      })),
      ...(assetForecast.future_predictions || []).map((d) => ({
        date: d.date,
        historical_price: null,
        forecast_price: d.forecast_price,
      })),
    ]
    : [];
  const assetTitle = asset === 'BTC-USD' ? 'Bitcoin Predictive Trajectory' : `${asset} Predictive Trajectory`;

  return (
    <div className="combined-analytics">
      <div className="section-header">
        <button className="btn btn-secondary" onClick={() => navigate(`/portfolio/${id}`)}>← Back</button>
        <div className="title-row">
          <h1>Portfolio Analytics</h1>
          {syncing && <span className="sync-badge">Live Syncing...</span>}
        </div>
      </div>
      <div className="controls">
        <div className="control">
          <label>Past Days</label>
          <select value={pastDays} onChange={(e) => setPastDays(parseInt(e.target.value || '365'))}>
            <option value={30}>30</option>
            <option value={90}>90</option>
            <option value={180}>180</option>
            <option value={365}>365</option>
          </select>
        </div>
      </div>
      {(goldLive || silverLive) && (
        <div className="live-prices">
          <div className="price-card">
            <div className="label">GLD Live Price</div>
            <div className="value">{goldLive ? `$${Number(goldLive.current_price || 0).toFixed(2)}` : '—'}</div>
          </div>
          <div className="price-card">
            <div className="label">SLV Live Price</div>
            <div className="value">{silverLive ? `$${Number(silverLive.current_price || 0).toFixed(2)}` : '—'}</div>
          </div>
        </div>
      )}

      {liveAnalyses?.analyses && (
        <ChartCard
          title="Clusters (Discount vs Opportunity)"
          description="Live analysis clustering"
          type="scatter"
          data={liveAnalyses.analyses.map(a => ({ name: a.company.symbol, x: a.discount_percentage || 0, y: a.opportunity_score || 0, cluster: 0 }))}
          xKey="x"
          yKey="y"
          clusterKey="cluster"
          xLabel="Discount %"
          yLabel="Opportunity"
          fullWidth={true}
        />
      )}

      {isCryptoAIPortfolio && (
        <div className="classic-forecast-card">
          <div className="classic-forecast-header">
            <h2>{assetTitle}</h2>
            <div className="classic-forecast-controls">
              <label htmlFor="asset-select">Asset</label>
              <select id="asset-select" value={asset} onChange={(e) => setAsset(e.target.value)}>
                <option value="BTC-USD">BTC-USD (Bitcoin)</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
              </select>
              <label htmlFor="asset-forecast-days">Forecast Days</label>
              <select
                id="asset-forecast-days"
                value={assetForecastDays}
                onChange={(e) => setAssetForecastDays(parseInt(e.target.value, 10))}
              >
                <option value={7}>7</option>
                <option value={14}>14</option>
                <option value={30}>30</option>
                <option value={60}>60</option>
              </select>
            </div>
          </div>

          {assetForecastLoading && <div className="loading">Loading live asset forecast...</div>}
          {assetForecastError && <div className="error-message">{assetForecastError}</div>}
          {!assetForecastLoading && !assetForecastError && assetForecastChartData.length > 0 && (
            <div className="classic-forecast-chart">
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={assetForecastChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" minTickGap={30} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="historical_price"
                    stroke="#1f4e79"
                    strokeWidth={2}
                    dot={false}
                    name="Historical Price"
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast_price"
                    stroke="#8b4513"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="6 4"
                    name="Forecast Price"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {pca?.stocks && (
        <ChartCard
          title="PCA Scatter"
          description="Principal components of stocks"
          type="scatter"
          data={pca.stocks.map(s => ({ name: s.symbol, x: s.x, y: s.y, cluster: 0 }))}
          xKey="x"
          yKey="y"
          clusterKey="cluster"
          xLabel="PC1"
          yLabel="PC2"
          fullWidth={true}
        />
      )}

      {reg?.stocks && reg.stocks.length > 0 && (
        <div className="regression-section">
          <h2>Regression (first stock)</h2>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={[...(reg.stocks[0].historical_data || []), ...(reg.stocks[0].future_predictions || []).map(f => ({ date: f.date, trend: f.predicted_price }))]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="price" stroke="#8884d8" name="Price" />
              <Line type="monotone" dataKey="trend" stroke="#82ca9d" name="Trend/Forecast" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {corrSeries && (
        <div className="correlation-section">
          <h2>Gold vs Silver Correlation</h2>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={corrSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="GLD" stroke="#d4af37" name="GLD" />
              <Line type="monotone" dataKey="SLV" stroke="#c0c0c0" name="SLV" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {returnPairs && (
        <ChartCard
          title="Returns Scatter (GLD vs SLV)"
          description={`Daily returns correlation r=${(corrCoeff ?? 0).toFixed(3)}`}
          type="scatter"
          data={returnPairs}
          xKey="x"
          yKey="y"
          clusterKey="cluster"
          xLabel="GLD Return %"
          yLabel="SLV Return %"
          fullWidth={true}
        />
      )}
      {rollingCorr && (
        <>
          <div className="controls">
            <div className="control">
              <label>Rolling Correlation Window</label>
              <select value={rollWindow} onChange={(e) => setRollWindow(parseInt(e.target.value || '30'))}>
                <option value={14}>14</option>
                <option value={30}>30</option>
                <option value={60}>60</option>
                <option value={90}>90</option>
              </select>
            </div>
          </div>
          <ChartCard
            title="Rolling Correlation (GLD vs SLV)"
            description={`Window=${rollWindow} days`}
            type="line"
            data={rollingCorr}
            dataKey="r"
            nameKey="date"
            fullWidth={true}
          />
        </>
      )}
    </div>
  );
}
