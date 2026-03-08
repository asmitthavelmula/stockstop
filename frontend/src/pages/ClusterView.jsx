import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { portfolioAPI } from '../services/api';
import ChartCard from '../components/ChartCard';

export default function ClusterView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clusterData, setClusterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [axes, setAxes] = useState({ x: 'discount_percentage', y: 'opportunity_score' });
  const [k, setK] = useState(3);
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState('All');

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError('');
      try {
        const res = await portfolioAPI.analyzeAllLive(id, 365);
        const analyses = res.data.analyses || [];
        if (!analyses.length) throw new Error('No analysis data');
        const allSectors = Array.from(new Set(analyses.map(a => a.company.sector).filter(Boolean)));
        setSectors(['All', ...allSectors]);
        const filtered = selectedSector === 'All' ? analyses : analyses.filter(a => a.company.sector === selectedSector);
        const pts = filtered.map(a => {
          const xVal =
            axes.x === 'discount_percentage'
              ? a.discount_percentage
              : axes.x === 'pe_ratio_current'
              ? a.pe_ratio_current
              : a.opportunity_score;
          const yVal =
            axes.y === 'opportunity_score'
              ? a.opportunity_score
              : axes.y === 'discount_percentage'
              ? a.discount_percentage
              : a.pe_ratio_current;
          return {
            name: a.company.symbol,
            x: parseFloat(xVal || 0),
            y: parseFloat(yVal || 0),
          };
        });
        const kk = Math.min(k, pts.length || 1);
        const centroids = pts.slice(0, kk).map(p => [p.x, p.y]);
        let labels = new Array(pts.length).fill(0);
        for (let iter = 0; iter < 20; iter++) {
          const newLabels = [];
          for (let pi = 0; pi < pts.length; pi++) {
            const p = pts[pi];
            const d = centroids.map(c => Math.hypot(p.x - c[0], p.y - c[1]));
            const minIdx = d.indexOf(Math.min(...d));
            newLabels.push(minIdx);
          }
          labels = newLabels;
          for (let i = 0; i < kk; i++) {
            const group = pts.filter((_, idx) => labels[idx] === i);
            if (group.length) {
              const mx = group.reduce((s, g) => s + g.x, 0) / group.length;
              const my = group.reduce((s, g) => s + g.y, 0) / group.length;
              centroids[i] = [mx, my];
            }
          }
        }
        setClusterData(pts.map((p, idx) => ({ ...p, cluster: labels[idx] })));
      } catch (e) {
        setError('Unable to compute clusters for this portfolio');
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [id, axes, k, selectedSector]);

  if (loading) return <div className="loading">Computing clusters...</div>;
  if (error) return (
    <div className="error-container">
      <p>{error}</p>
      <button onClick={() => navigate('/')}>Back to Home</button>
    </div>
  );

  return (
    <div className="cluster-view">
      <div className="section-header">
        <h2>Clusters for Portfolio ID {id}</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Back</button>
      </div>
      <div className="controls">
        <div className="control">
          <label>X Axis</label>
          <select value={axes.x} onChange={(e) => setAxes({ ...axes, x: e.target.value })}>
            <option value="discount_percentage">Discount %</option>
            <option value="pe_ratio_current">PE Ratio</option>
          </select>
        </div>
        <div className="control">
          <label>Y Axis</label>
          <select value={axes.y} onChange={(e) => setAxes({ ...axes, y: e.target.value })}>
            <option value="opportunity_score">Opportunity</option>
            <option value="pe_ratio_current">PE Ratio</option>
            <option value="discount_percentage">Discount %</option>
          </select>
        </div>
        <div className="control">
          <label>Clusters</label>
          <input type="number" min="1" max="6" value={k} onChange={(e) => setK(Math.max(1, Math.min(6, parseInt(e.target.value || '1'))))} />
        </div>
        <div className="control">
          <label>Sector</label>
          <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)}>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <ChartCard
        title={`Clusters (${axes.x === 'discount_percentage' ? 'Discount %' : axes.x === 'pe_ratio_current' ? 'PE Ratio' : 'Opportunity'} vs ${axes.y === 'opportunity_score' ? 'Opportunity' : axes.y === 'discount_percentage' ? 'Discount %' : 'PE Ratio'})`}
        description="Colored by cluster"
        type="scatter"
        data={clusterData}
        xKey="x"
        yKey="y"
        clusterKey="cluster"
        xLabel={axes.x === 'discount_percentage' ? 'Discount %' : 'PE Ratio'}
        yLabel={axes.y === 'opportunity_score' ? 'Opportunity' : axes.y === 'discount_percentage' ? 'Discount %' : 'PE Ratio'}
        fullWidth={true}
      />
      <div className="cluster-table">
        <h3>Points</h3>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>{axes.x === 'discount_percentage' ? 'Discount %' : axes.x === 'pe_ratio_current' ? 'PE Ratio' : 'Opportunity'}</th>
              <th>{axes.y === 'opportunity_score' ? 'Opportunity' : axes.y === 'discount_percentage' ? 'Discount %' : 'PE Ratio'}</th>
              <th>Cluster</th>
            </tr>
          </thead>
          <tbody>
            {clusterData.map((p, idx) => (
              <tr key={idx}>
                <td>{p.name}</td>
                <td>
                  {Number(p.x).toFixed(2)}
                  {(axes.x === 'discount_percentage') ? '%' : ''}
                </td>
                <td>
                  {Number(p.y).toFixed(2)}
                  {(axes.y === 'discount_percentage') ? '%' : ''}
                </td>
                <td>{p.cluster}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
