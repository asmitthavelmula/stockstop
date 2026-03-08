import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import './ChartCard.css';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

const ChartCard = ({
  title,
  description,
  type = 'bar',
  data,
  dataKey,
  dataKey1,
  dataKey2,
  name1,
  name2,
  nameKey,
  fullWidth = false,
  xKey,
  yKey,
  clusterKey,
  xLabel,
  yLabel,
  highlights
}) => {
  const renderScatterTooltip = ({ payload }) => {
    const p = payload && payload[0] && payload[0].payload;
    if (!p) return null;
    return (
      <div className="chart-tooltip">
        <div><strong>{p.name}</strong></div>
        <div>{xLabel || 'X'}: {Number(p[xKey]).toFixed(2)}{(xLabel || '').includes('%') ? '%' : ''}</div>
        <div>{yLabel || 'Y'}: {Number(p[yKey]).toFixed(2)}{(yLabel || '').includes('%') ? '%' : ''}</div>
        <div>Cluster: {p.cluster}</div>
      </div>
    );
  };
  const renderChart = () => {
    switch (type) {
      case 'bar':
        if (dataKey1 && dataKey2) {
          // Comparison bar chart
          return (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={dataKey1} fill="#8884d8" name={name1} />
                <Bar dataKey={dataKey2} fill="#82ca9d" name={name2} />
              </BarChart>
            </ResponsiveContainer>
          );
        }
        // Simple bar chart
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={dataKey} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke="#8884d8" 
                dot={false}
                name="Price"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey={dataKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        const groups = {};
        (data || []).forEach(d => {
          const key = d[clusterKey] ?? 0;
          if (!groups[key]) groups[key] = [];
          groups[key].push(d);
        });
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={xKey}
                name={xLabel || 'X'}
                tickFormatter={(v) => (xLabel || '').includes('%') ? `${Number(v).toFixed(2)}%` : `${Number(v).toFixed(2)}`}
              />
              <YAxis
                dataKey={yKey}
                name={yLabel || 'Y'}
                tickFormatter={(v) => (yLabel || '').includes('%') ? `${Number(v).toFixed(2)}%` : `${Number(v).toFixed(2)}`}
              />
              <ReferenceLine x={0} stroke="#999" strokeDasharray="3 3" />
              <ReferenceLine y={0} stroke="#999" strokeDasharray="3 3" />
              <Tooltip content={renderScatterTooltip} />
              <Legend />
              {Object.keys(groups).map((k, i) => (
                <Scatter key={k} name={`Cluster ${k}`} data={groups[k]} fill={COLORS[i % COLORS.length]} />
              ))}
              {(highlights || []).map((h, i) => (
                <Scatter
                  key={`hl-${i}`}
                  name={h.name}
                  data={[{ [xKey]: h[xKey], [yKey]: h[yKey], name: h.label || h.name, cluster: '★' }]}
                  fill={h.color || '#ff7c7c'}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const renderCustomLabel = ({ name, value }) => {
    return `${value.toFixed(1)}`;
  };

  return (
    <div className={`chart-card ${fullWidth ? 'full-width' : ''}`}>
      <div className="chart-header">
        <h3>{title}</h3>
        <p className="chart-description">{description}</p>
      </div>
      <div className="chart-content">
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartCard;
