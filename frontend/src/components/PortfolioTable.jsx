import React from 'react';
import './PortfolioTable.css';

const PortfolioTable = ({ stocks }) => {
  return (
    <div className="portfolio-table-container">
      <h3>Portfolio Overview</h3>
      <table className="portfolio-table">
        <thead>
          <tr>
            <th>Stock Name</th>
            <th>Current Price</th>
            <th>Current Value</th>
            <th>Profit / Loss</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => (
            <tr key={stock.id}>
              <td>
                <div className="stock-info">
                  <span className="stock-symbol">{stock.company_symbol}</span>
                  <span className="stock-name">{stock.company_name}</span>
                </div>
              </td>
              <td>₹{Number(stock.current_price || 0).toFixed(2)}</td>
              <td>₹{Number(stock.current_value || 0).toFixed(2)}</td>
              <td className={stock.profit_loss >= 0 ? 'positive' : 'negative'}>
                ₹{Number(stock.profit_loss || 0).toFixed(2)}
                <span className="percentage">
                  ({Number(stock.gain_loss_percentage || 0).toFixed(2)}%)
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PortfolioTable;
