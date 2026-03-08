import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import './PortfolioGrowthChart.css';

const PortfolioGrowthChart = ({ data, title = "Portfolio Growth" }) => {
  if (!data || !data.dates || data.dates.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>No growth data available yet. Add stocks and wait for historical data sync.</p>
      </div>
    );
  }

  const chartData = data.dates.map((date, index) => ({
    date,
    value: data.values[index]
  }));

  return (
    <div className="portfolio-growth-chart">
      <h3>{title}</h3>
      <div className="chart-container" style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }} 
              tickFormatter={(str) => {
                const date = new Date(str);
                return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `₹${value.toLocaleString()}`}
            />
            <Tooltip 
              formatter={(value) => [`₹${value.toLocaleString()}`, 'Total Value']}
              labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#8884d8" 
              fillOpacity={1} 
              fill="url(#colorValue)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PortfolioGrowthChart;
