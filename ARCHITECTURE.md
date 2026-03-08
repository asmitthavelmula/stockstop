# Project Architecture & Design Overview

## 🏗️ System Architecture

```
┌─────────────────┐
│  React Frontend │
│   (Port 3000)   │
└────────┬────────┘
         │
    API Calls
   (Axios HTTP)
         │
┌────────▼────────┐
│  Django Backend │
│   (Port 8000)   │
└────────┬────────┘
         │
    Database
   (SQLite)
```

## 🎯 User Flow

```
1. HOME PAGE
   ├─ View all portfolios
   ├─ Portfolio statistics
   └─ Create new portfolio

2. CREATE PORTFOLIO
   ├─ Enter name & description
   └─ Create portfolio

3. PORTFOLIO DETAIL
   ├─ View portfolio stats
   ├─ Add stocks
   └─ List stocks with performance

4. STOCK EXPAND
   ├─ Select analysis period
   └─ Start analysis (API call to backend)

5. STOCK ANALYSIS PAGE
   ├─ PE Ratio Chart
   ├─ Discount Chart
   ├─ Opportunity Score Chart
   ├─ Price History Chart
   └─ Recommendation badge
```

## 🗄️ Database Schema

### Portfolio Table
```
┌─────────────────────────────────────┐
│         Portfolio                   │
├─────────────────────────────────────┤
│ id (PK)                             │
│ name (VARCHAR)                      │
│ description (TEXT)                  │
│ created_at (DATETIME)               │
│ updated_at (DATETIME)               │
└─────────────────────────────────────┘
         ▲
         │
    One-to-Many
         │
         ▼
┌─────────────────────────────────────┐
│          Stock                      │
├─────────────────────────────────────┤
│ id (PK)                             │
│ portfolio_id (FK) ──────────────────┤
│ company_id (FK) ──────────────────┐ │
│ quantity (INT)                    │ │
│ purchase_price (DECIMAL)          │ │
│ purchase_date (DATE)              │ │
│ added_at (DATETIME)               │ │
└─────────────────────────────────────┘│
         ▲                              │
         │                              │
    One-to-Many                         │
         │                              │
         │                              ▼
         │      ┌─────────────────────────────────────┐
         │      │       Company                       │
         │      ├─────────────────────────────────────┤
         │      │ id (PK)                             │
         │      │ symbol (VARCHAR, UNIQUE)            │
         │      │ name (VARCHAR)                      │
         │      │ sector (VARCHAR)                    │
         │      │ current_price (DECIMAL)             │
         │      │ market_cap (BIGINT)                 │
         │      │ pe_ratio (FLOAT)                    │
         │      │ dividend_yield (FLOAT)              │
         │      │ last_updated (DATETIME)             │
         │      └─────────────────────────────────────┘
         │              ▲
         │              │
         │         One-to-Many
         │              │
         │              ▼
         │      ┌─────────────────────────────────────┐
         │      │   HistoricalPrice                   │
         │      ├─────────────────────────────────────┤
         │      │ id (PK)                             │
         │      │ company_id (FK) ──────────────────┐ │
         │      │ date (DATE)                       │ │
         │      │ open_price (DECIMAL)              │ │
         │      │ high_price (DECIMAL)              │ │
         │      │ low_price (DECIMAL)               │ │
         │      │ close_price (DECIMAL)             │ │
         │      │ volume (BIGINT)                   │ │
         │      └─────────────────────────────────────┘
         │
         │
    One-to-Many
         │
         ▼
┌─────────────────────────────────────┐
│      StockAnalysis                  │
├─────────────────────────────────────┤
│ id (PK)                             │
│ stock_id (FK) ──────────────────────┤
│ analysis_date (DATETIME)            │
│ past_days (INT)                     │
│ pe_ratio_current (FLOAT)            │
│ pe_ratio_average (FLOAT)            │
│ pe_ratio_min (FLOAT)                │
│ pe_ratio_max (FLOAT)                │
│ discount_percentage (FLOAT)         │
│ opportunity_score (FLOAT)           │
│ current_price (DECIMAL)             │
│ fair_value (DECIMAL)                │
│ recommendation (VARCHAR)            │
└─────────────────────────────────────┘
```

## 🔄 API Request/Response Flow

### Adding Stock Flow
```
Client
   │
   ├─ POST /portfolios/{id}/add_stock/
   │  (symbol, quantity, purchase_price, purchase_date)
   │
   ▼
Backend (portfolios/views.py)
   │
   ├─ Validate input
   ├─ Search/Create Company
   │  └─ Call StockService.fetch_company_data() (Yahoo Finance)
   │
   ├─ Update Company Price
   │  └─ Call StockService.update_company_price()
   │
   ├─ Create/Update Stock Record
   │
   ▼
Database
   │
   ├─ Company table (update/insert)
   ├─ Stock table (insert)
   │
   ▼
Backend (Return)
   │
   ├─ Serialize Stock with Company data
   │
   ▼
Client
   └─ Display stock in list
```

### Analysis Flow
```
Client
   │
   ├─ POST /stocks/{id}/analyze/
   │  (past_days)
   │
   ▼
Backend (portfolios/views.py - analyze action)
   │
   ├─ Call AnalysisService.analyze_stock(stock, past_days)
   │
   ▼
AnalysisService
   │
   ├─ Fetch historical data
   │  └─ Call StockService.fetch_historical_data()
   │     └─ Call yfinance (Yahoo Finance API)
   │
   ├─ Store historical prices
   │  └─ Save to HistoricalPrice table
   │
   ├─ Calculate metrics
   │  ├─ _calculate_pe_metrics()
   │  ├─ _calculate_fair_value()
   │  ├─ _calculate_discount()
   │  ├─ _calculate_opportunity_score()
   │  └─ _get_recommendation()
   │
   ├─ Create StockAnalysis record
   │
   ▼
Database
   │
   ├─ HistoricalPrice table (insert multiple records)
   ├─ StockAnalysis table (insert analysis record)
   │
   ▼
Backend (Return)
   │
   ├─ Serialize Analysis with company data
   │
   ▼
Client
   └─ Display in analysis page with charts
```

## 🎨 Frontend Component Hierarchy

```
App
├─ Router
│  ├─ Route "/"
│  │  └─ Home
│  │     ├─ Header
│  │     ├─ PortfolioGrid
│  │     │  └─ PortfolioCard (×n)
│  │     └─ Footer
│  │
│  ├─ Route "/create-portfolio"
│  │  └─ CreatePortfolio
│  │     ├─ Form Input
│  │     └─ Submit Button
│  │
│  ├─ Route "/portfolio/:id"
│  │  └─ PortfolioDetail
│  │     ├─ Header with Stats
│  │     ├─ StockForm
│  │     ├─ StockList
│  │     │  └─ StockRow (×n)
│  │     │     └─ ExpandedAnalysisRow
│  │     └─ Footer
│  │
│  └─ Route "/stock/:id/analysis"
│     └─ StockAnalysis
│        ├─ Summary Stats
│        ├─ ChartsGrid
│        │  ├─ ChartCard
│        │  │  ├─ PE Ratio Bar Chart
│        │  │  ├─ Discount Bar Chart
│        │  │  ├─ Opportunity Pie Chart
│        │  │  └─ Price Line Chart
│        │  └─ ChartCard (×4)
│        └─ Analysis Details
│
└─ Navigation Bar
```

## 📊 Key Calculations

### PE Ratio Metrics
```
pe_ratio_average = Average of (current_price / eps) for period
pe_ratio_min = Minimum P/E ratio in period
pe_ratio_max = Maximum P/E ratio in period
```

### Fair Value Calculation
```
If P/E available:
  EPS = Current_Price / PE_Ratio
  Fair_Value = EPS × Industry_Average_PE (15)
Else:
  Fair_Value = Average_Historical_Price
```

### Discount Percentage
```
Discount = ((Fair_Value - Current_Price) / Fair_Value) × 100

If Discount > 0: Stock is undervalued (buying opportunity)
If Discount < 0: Stock is overvalued
```

### Opportunity Score (0-100)
```
discount_score = min(discount, 50) / 50 × 30  (0-30 points)
price_score = max((purchase_price - current) / purchase_price × 50, 0)  (0-30 points)
volatility_score = 20  (0-20 points)

opportunity_score = min(discount_score + price_score + volatility_score, 100)
```

### Recommendations
```
If discount > 30% AND opportunity > 70:  STRONG_BUY
Else if discount > 20% AND opportunity > 60:  BUY
Else if discount > 10% AND opportunity > 50:  HOLD
Else if discount < -10%:  SELL
Else:  HOLD
```

## 🔐 Security Architecture

### Authentication & Authorization
Currently: Anonymous access to all endpoints

For Production:
- JWT token-based authentication
- User-specific portfolio data
- Role-based access control

### Data Validation
- Backend validation on all inputs
- Frontend pre-validation
- SQL injection prevention (Django ORM)
- CORS protection

### API Security
- Rate limiting (to be implemented)
- Input sanitization
- HTTPS in production
- CSRF protection

## ⚡ Performance Optimization

### Current Implementation
- SQLite database (suitable for development)
- Direct API calls to Yahoo Finance
- Pagination on list endpoints

### Production Recommendations
- PostgreSQL for better concurrency
- Redis for caching stock data
- Celery for async analysis tasks
- CDN for frontend assets
- API rate limiting
- Historical data caching

## 📱 Responsive Design

### Breakpoints
- **Desktop**: 1024px and above (full layout)
- **Tablet**: 768px - 1023px (adjusted grid)
- **Mobile**: Below 768px (single column, simplified)

### Design Features
- Mobile-first approach
- Touch-friendly buttons (min 44px)
- Responsive tables with horizontal scroll
- Collapsible sections on mobile
- Optimized images and fonts

## 🚀 Deployment Architecture

### Development
```
Frontend (npm start on :3000)
   ↓
Backend (python manage.py runserver on :8000)
   ↓
SQLite Database
```

### Production
```
Frontend (npm run build → Vercel/Netlify)
   ↓
Backend (Gunicorn → Heroku/PythonAnywhere)
   ↓
PostgreSQL Database
   ↓
Redis Cache
   ↓
Celery Workers
```

## 📊 Data Refresh Strategy

### Stock Prices
- Fetched on-demand when adding/viewing stock
- Yahoo Finance API (real-time data)
- Cached in database

### Historical Data
- Fetched during analysis only
- Stored in HistoricalPrice table
- 1-3 second API call per analysis

### Company Data
- Fetched when company first added
- Updated when stock price is updated
- Cached for 24 hours (can be implemented)

## 🔌 External Dependencies

### APIs
- **Yahoo Finance (yfinance)**: Stock data, historical prices
- **Browser APIs**: LocalStorage for preferences (if needed)

### Libraries
- **Backend**: Django, DRF, pandas, numpy
- **Frontend**: React, React Router, Axios, Recharts

### Services
- Database: SQLite (dev), PostgreSQL (prod)
- Cache: Redis (optional for prod)
- Task Queue: Celery (optional for prod)

## 📈 Scalability Considerations

### Current Bottlenecks
- Single-process Django server
- SQLite (single connection)
- Synchronous API calls

### Scaling Solutions
1. **Horizontal**: Multiple application servers
2. **Database**: PostgreSQL with replication
3. **Caching**: Redis for frequently accessed data
4. **Async**: Celery workers for analysis tasks
5. **CDN**: CloudFlare/Cloudflare for static assets
6. **Load Balancer**: Nginx for traffic distribution

## 🧪 Testing Strategy

### Backend Testing
- Unit tests for analysis calculations
- Integration tests for API endpoints
- Mock Yahoo Finance responses

### Frontend Testing
- Component tests with React Testing Library
- Integration tests with Cypress
- Visual regression testing

---

This architecture provides a solid foundation for a stock analysis platform with room for growth and optimization!
