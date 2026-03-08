# StockKK Analysis - Investment Portfolio Dashboard

A comprehensive stock analysis platform built with Django and React that helps users manage their investment portfolios and analyze stocks with data-driven insights.

## 🌟 Features

### Portfolio Management
- **Create Multiple Portfolios**: Organize investments across different portfolios
- **Add Stocks**: Add any publicly traded stock to your portfolio
- **Track Performance**: Monitor gain/loss, portfolio value, and investment metrics
- **Real-time Updates**: Get current prices from Yahoo Finance

### Stock Analysis
- **Historical Data Analysis**: Analyze stocks based on 30, 90, 180, or 365 days of historical data
- **PE Ratio Analysis**: View current, average, min, and max P/E ratios
- **Discount Analysis**: Calculate fair value vs current price
- **Opportunity Scoring**: Get a 0-100 opportunity score for each stock
- **Visual Charts**: Beautiful charts for P/E ratio, discount analysis, and price history
- **Buy/Sell Recommendations**: AI-powered recommendations based on analysis

### User Experience
- Clean, intuitive dashboard interface
- Responsive design for mobile and desktop
- Real-time data updates
- Easy-to-use forms for adding stocks
- Expandable stock rows with detailed analysis options

## 🏗️ Architecture

### Backend (Django)
```
backend/
├── config/
│   ├── settings.py       # Django configuration
│   ├── urls.py           # URL routing
│   ├── wsgi.py           # WSGI application
│   └── __init__.py
├── portfolios/
│   ├── models.py         # Database models
│   ├── views.py          # API views
│   ├── serializers.py    # DRF serializers
│   ├── urls.py           # API URLs
│   ├── admin.py          # Django admin
│   └── services/
│       ├── stock_service.py      # Stock data fetching
│       ├── analysis_service.py   # Analysis logic
│       └── __init__.py
├── manage.py
└── .env
```

### Frontend (React)
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── pages/
│   │   ├── CreatePortfolio.jsx    # Portfolio creation
│   │   ├── PortfolioDetail.jsx    # Portfolio view
│   │   └── StockAnalysis.jsx      # Analysis charts
│   ├── components/
│   │   ├── StockForm.jsx          # Add stock form
│   │   ├── StockList.jsx          # Stocks list table
│   │   └── ChartCard.jsx          # Chart component
│   ├── services/
│   │   └── api.js                 # API client
│   ├── App.jsx
│   ├── index.js
│   └── index.css
└── package.json
```

## 🚀 Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Create migrations**
```bash
python manage.py makemigrations
python manage.py migrate
```

5. **Create superuser (optional, for admin access)**
```bash
python manage.py createsuperuser
```

6. **Run development server**
```bash
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## 📊 API Endpoints

### Portfolio APIs
- `GET /api/portfolios/` - List all portfolios
- `GET /api/portfolios/{id}/` - Get portfolio details
- `POST /api/portfolios/` - Create new portfolio
- `POST /api/portfolios/{id}/add_stock/` - Add stock to portfolio
- `PUT /api/portfolios/{id}/` - Update portfolio
- `DELETE /api/portfolios/{id}/` - Delete portfolio

### Stock APIs
- `GET /api/stocks/` - List stocks (supports `portfolio_id` filter)
- `GET /api/stocks/{id}/` - Get stock details
- `POST /api/stocks/{id}/analyze/` - Analyze stock (requires `past_days`)
- `GET /api/stocks/{id}/price_history/` - Get price history (requires `past_days`)
- `GET /api/stocks/{id}/latest_analysis/` - Get latest analysis with charts data
- `DELETE /api/stocks/{id}/` - Delete stock

### Company APIs
- `GET /api/companies/` - List companies
- `GET /api/companies/search/` - Search company (requires `symbol`)
- `GET /api/companies/{id}/` - Get company details

## 🔄 Workflow

### Step 1: Create Portfolio
1. Click "Create New Portfolio" on homepage
2. Enter portfolio name and optional description
3. Submit to create portfolio

### Step 2: Add Stocks
1. Enter portfolio detail page
2. Click "Add Stock" button
3. Search for stock by symbol (e.g., AAPL, GOOGL)
4. Enter quantity and purchase price
5. Select purchase date
6. Click "Add Stock"

### Step 3: Analyze Stocks
1. On portfolio page, click the expand button (📊) next to a stock
2. Select analysis period (30, 90, 180, or 365 days)
3. Click "Start Analysis"
4. View results in the expanded section

### Step 4: View Detailed Analysis
1. Click "View Analysis Results" in the analysis section
2. View three main charts:
   - **PE Ratio Graph**: Current, Average, Min, Max P/E ratios
   - **Discount Analysis**: Fair value vs current price
   - **Opportunity Score**: 0-100 investment opportunity rating
3. See price history chart for selected period

## 📱 UI Components

### Home Page
- Hero section with call-to-action
- Portfolio cards grid showing main metrics
- Quick access to create new portfolio

### Portfolio Page
- Portfolio header with statistics
- Stocks table with performance metrics
- Add stock form
- Expandable rows for analysis options

### Analysis Page
- Stock recommendation badge
- Summary metrics (current price, fair value, discount, opportunity)
- Three main analysis charts
- Price history visualization
- Detailed analysis information

## 🎨 Design Features

- **Modern Gradient UI**: Purple and blue gradients for visual appeal
- **Responsive Layout**: Works seamlessly on desktop and mobile
- **Interactive Charts**: Recharts for data visualization
- **Color-coded Performance**: Green for gains, red for losses
- **Smooth Animations**: Hover effects and transitions
- **Accessible Design**: Clear typography and contrast

## 📈 Analysis Metrics

### PE Ratio Analysis
- Compares current P/E with historical averages
- Identifies overvaluation/undervaluation
- Shows min/max ranges for context

### Discount Analysis
- Calculates fair value based on P/E ratios
- Shows percentage discount vs fair value
- Positive discount = buying opportunity

### Opportunity Score
- 0-100 rating based on multiple factors
- Considers discount percentage and volatility
- Combines price positioning relative to purchase price
- Helps identify investment opportunities

### Recommendations
- **STRONG_BUY**: Excellent buying opportunity
- **BUY**: Good buying opportunity
- **HOLD**: Neutral position
- **SELL**: Considered overvalued
- **STRONG_SELL**: Avoid or exit position

## 🔧 Technologies Used

### Backend
- **Django**: Web framework
- **Django REST Framework**: API development
- **yfinance**: Stock data fetching
- **pandas/numpy**: Data analysis
- **SQLite**: Database

### Frontend
- **React**: UI library
- **React Router**: Navigation
- **Axios**: HTTP client
- **Recharts**: Data visualization
- **CSS3**: Styling

## 🚀 Deployment

### Backend (Heroku/PythonAnywhere)
1. Install gunicorn: `pip install gunicorn`
2. Create Procfile: `web: gunicorn config.wsgi`
3. Deploy using platform's guidelines

### Frontend (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy `build/` folder to hosting platform
3. Configure environment variables

## 📝 Database Models

### Portfolio
- `name`: Portfolio name
- `description`: Optional description
- `created_at`, `updated_at`: Timestamps

### Company
- `symbol`: Stock ticker symbol
- `name`: Company name
- `sector`: Industry sector
- `current_price`: Current stock price
- `pe_ratio`: Price-to-Earnings ratio
- `market_cap`: Market capitalization

### Stock
- `portfolio`: Foreign key to Portfolio
- `company`: Foreign key to Company
- `quantity`: Number of shares
- `purchase_price`: Price paid per share
- `purchase_date`: Date of purchase

### StockAnalysis
- `stock`: Foreign key to Stock
- `past_days`: Analysis period in days
- `pe_ratio_*`: P/E metrics
- `discount_percentage`: Fair value discount
- `opportunity_score`: Investment opportunity rating
- `recommendation`: Buy/Sell recommendation

### HistoricalPrice
- `company`: Foreign key to Company
- `date`: Price date
- `open_price`, `high_price`, `low_price`, `close_price`: OHLC data
- `volume`: Trading volume

## 🔐 Security Notes

- Change `SECRET_KEY` in production
- Set `DEBUG = False` in production
- Use environment variables for sensitive data
- Implement authentication for production
- Add CORS restrictions for specific domains
- Use HTTPS in production

## 🐛 Troubleshooting

### API Connection Issues
- Ensure backend is running on `http://localhost:8000`
- Check CORS settings in Django settings.py
- View browser console for detailed error messages

### Stock Not Found
- Verify ticker symbol is correct (e.g., AAPL, not Apple)
- Check Yahoo Finance for valid symbols
- Some delisted stocks may not be available

### Chart Not Showing
- Ensure analysis has been completed
- Check that historical data was fetched successfully
- Verify price history data exists in database

## 📚 Future Enhancements

- User authentication and profiles
- Real-time notifications
- Advanced technical indicators (RSI, MACD, Bollinger Bands)
- Portfolio comparison tools
- Export to PDF/CSV
- Mobile app (React Native)
- Machine learning predictions
- Dividend tracking
- Tax-loss harvesting insights

## 📞 Support

For issues or suggestions, please refer to the documentation or contact support.

## 📄 License

This project is open source and available under the MIT License.

---

**Happy Investing! 📈**
