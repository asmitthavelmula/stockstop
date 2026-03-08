# Setup Verification Checklist

Use this checklist to ensure your development environment is properly configured.

## ✅ Prerequisites

### System Requirements
- [ ] Python 3.8+ installed (`python --version`)
- [ ] Node.js 14+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed (`git --version`)
- [ ] Terminal/Command line access

### Package Managers
- [ ] pip working (`pip --version`)
- [ ] npm working (`npm --version`)

---

## ✅ Backend Setup

### 1. Virtual Environment
- [ ] Created Python virtual environment
  ```bash
  python -m venv venv
  ```
- [ ] Virtual environment activated
  ```bash
  # Windows:
  venv\Scripts\activate
  # macOS/Linux:
  source venv/bin/activate
  ```
- [ ] Prompt shows `(venv)` prefix

### 2. Dependencies
- [ ] requirements.txt exists in `/backend`
- [ ] Dependencies installed
  ```bash
  pip install -r requirements.txt
  ```
- [ ] Key packages installed:
  - [ ] Django==4.2.0
  - [ ] djangorestframework==3.14.0
  - [ ] django-cors-headers==4.0.0
  - [ ] yfinance==0.2.28
  - [ ] pandas==2.0.0
  - [ ] numpy==1.24.0
  - [ ] requests==2.31.0

### 3. Configuration
- [ ] .env file created in `/backend`
- [ ] DEBUG=True in .env
- [ ] SECRET_KEY set in .env
- [ ] ALLOWED_HOSTS configured

### 4. Database
- [ ] Migrations applied
  ```bash
  python manage.py migrate
  ```
- [ ] db.sqlite3 file exists
- [ ] No migration errors

### 5. Superuser (Optional)
- [ ] Superuser created (optional)
  ```bash
  python manage.py createsuperuser
  ```

### 6. Django Server
- [ ] Server starts without errors
  ```bash
  python manage.py runserver
  ```
- [ ] Dashboard accessible at `http://localhost:8000`
- [ ] Admin panel accessible at `http://localhost:8000/admin`
- [ ] API accessible at `http://localhost:8000/api`

---

## ✅ Frontend Setup

### 1. Dependencies
- [ ] package.json exists in `/frontend`
- [ ] Dependencies installed
  ```bash
  npm install
  ```
- [ ] node_modules folder created
- [ ] Key packages installed:
  - [ ] react==18.2.0
  - [ ] react-dom==18.2.0
  - [ ] react-router-dom==6.8.0
  - [ ] axios==1.3.2
  - [ ] recharts==2.5.0

### 2. Configuration
- [ ] API proxy set to `http://localhost:8000` in package.json
- [ ] .env file created (if needed)

### 3. React Development Server
- [ ] Server starts without errors
  ```bash
  npm start
  ```
- [ ] Browser opens automatically
- [ ] App loads at `http://localhost:3000`
- [ ] No console errors

### 4. CSS & Styling
- [ ] All CSS files present:
  - [ ] App.css
  - [ ] index.css
  - [ ] pages/CreatePortfolio.css
  - [ ] pages/PortfolioDetail.css
  - [ ] pages/StockAnalysis.css
  - [ ] components/ChartCard.css
  - [ ] components/StockForm.css
  - [ ] components/StockList.css

---

## ✅ Project Structure

### Backend Structure
```
backend/
├── [ ] config/
│   ├── [ ] __init__.py
│   ├── [ ] settings.py
│   ├── [ ] urls.py
│   ├── [ ] wsgi.py
│   └── [ ] asgi.py (optional)
├── [ ] portfolios/
│   ├── [ ] __init__.py
│   ├── [ ] admin.py
│   ├── [ ] apps.py
│   ├── [ ] models.py
│   ├── [ ] views.py
│   ├── [ ] serializers.py
│   ├── [ ] urls.py
│   ├── [ ] tests.py (optional)
│   └── [ ] services/
│       ├── [ ] __init__.py
│       ├── [ ] stock_service.py
│       ├── [ ] analysis_service.py
│       └── [ ] data_cleaner.py (optional)
├── [ ] manage.py
├── [ ] requirements.txt
├── [ ] .env
├── [ ] .env.example
└── [ ] db.sqlite3
```

### Frontend Structure
```
frontend/
├── [ ] public/
│   └── [ ] index.html
├── [ ] src/
│   ├── [ ] pages/
│   │   ├── [ ] CreatePortfolio.jsx
│   │   ├── [ ] CreatePortfolio.css
│   │   ├── [ ] PortfolioDetail.jsx
│   │   ├── [ ] PortfolioDetail.css
│   │   ├── [ ] StockAnalysis.jsx
│   │   └── [ ] StockAnalysis.css
│   ├── [ ] components/
│   │   ├── [ ] ChartCard.jsx
│   │   ├── [ ] ChartCard.css
│   │   ├── [ ] StockForm.jsx
│   │   ├── [ ] StockForm.css
│   │   ├── [ ] StockList.jsx
│   │   └── [ ] StockList.css
│   ├── [ ] services/
│   │   └── [ ] api.js
│   ├── [ ] App.jsx
│   ├── [ ] App.css
│   ├── [ ] index.js
│   └── [ ] index.css
├── [ ] package.json
└── [ ] node_modules/ (should exist but not in git)
```

---

## ✅ Functionality Testing

### Backend API Tests
1. **Portfolio Endpoints**
   - [ ] GET /api/portfolios/ (list portfolios)
   - [ ] POST /api/portfolios/ (create portfolio)
   - [ ] GET /api/portfolios/1/ (get portfolio details)

2. **Company Search**
   - [ ] GET /api/companies/search/?symbol=AAPL (search company)
   - [ ] Response includes company data

3. **Add Stock**
   - [ ] POST /api/portfolios/1/add_stock/ (add stock)
   - [ ] Stock appears in portfolio

4. **Stock Analysis**
   - [ ] POST /api/stocks/1/analyze/ (analyze stock)
   - [ ] GET /api/stocks/1/latest_analysis/ (get analysis)

### Frontend Feature Tests
1. **Navigation**
   - [ ] Home page loads
   - [ ] Navigation menu works
   - [ ] Page transitions smooth

2. **Portfolio Management**
   - [ ] Create portfolio form appears
   - [ ] Portfolio created successfully
   - [ ] Portfolio list updates

3. **Stock Management**
   - [ ] Add stock form appears
   - [ ] Stock search works
   - [ ] Stock added to portfolio
   - [ ] Stock appears in table

4. **Analysis**
   - [ ] Expand stock row works
   - [ ] Analysis options visible
   - [ ] Analysis completes
   - [ ] Results page shows charts

5. **Charts**
   - [ ] PE Ratio chart displays
   - [ ] Discount chart displays
   - [ ] Opportunity score displays
   - [ ] Price history chart displays

---

## ✅ Common Issues & Solutions

### Issue: "Module not found" error
- [ ] All dependencies installed: `pip install -r requirements.txt`
- [ ] Virtual environment activated
- [ ] Run `pip list` to verify packages

### Issue: API connection refused
- [ ] Backend server running on port 8000
- [ ] Frontend proxy configured correctly
- [ ] Check browser console (F12) for errors

### Issue: Database errors
- [ ] Migrations applied: `python manage.py migrate`
- [ ] Database file readable/writable
- [ ] No corrupted db.sqlite3

### Issue: Stock not found
- [ ] Internet connection available
- [ ] Yahoo Finance not blocked
- [ ] Ticker symbol valid (check online)

### Issue: Charts not showing
- [ ] Recharts installed: `npm list recharts`
- [ ] Analysis completed successfully
- [ ] Price history data available

---

## ✅ Port Configuration

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] No conflicting applications
- [ ] Ports not blocked by firewall

---

## ✅ Environment Variables

### Backend (.env)
```
[ ] DEBUG=True
[ ] SECRET_KEY=your-secret-key
[ ] ALLOWED_HOSTS=localhost,127.0.0.1
[ ] DATABASE_URL configured (if using PostgreSQL)
```

### Frontend (.env, if needed)
```
[ ] REACT_APP_API_URL=http://localhost:8000/api
```

---

## ✅ Browser Compatibility

- [ ] Chrome/Chromium compatible
- [ ] Firefox compatible
- [ ] Safari compatible (macOS)
- [ ] Edge compatible (Windows)

---

## ✅ Git & Version Control

- [ ] .gitignore file exists
- [ ] Git initialized: `git init`
- [ ] Initial commit made
- [ ] Node modules not tracked
- [ ] Virtual environment not tracked

---

## ✅ Documentation

- [ ] README.md exists and is readable
- [ ] QUICK_START.md exists
- [ ] API_DOCUMENTATION.md exists
- [ ] ARCHITECTURE.md exists
- [ ] This checklist is complete

---

## 🚀 Ready to Launch!

If all items are checked, your development environment is ready!

### To Start Development:
```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm start
```

### Common Development Tasks
```bash
# Create new migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create Django superuser
python manage.py createsuperuser

# Run Django shell
python manage.py shell

# Build frontend for production
npm run build

# Run frontend tests
npm test
```

---

## 📞 Troubleshooting Resources

1. **Django Documentation**: https://docs.djangoproject.com/
2. **React Documentation**: https://react.dev/
3. **yfinance Documentation**: https://github.com/ranaroussi/yfinance
4. **Stack Overflow**: Search for specific errors

---

**Last Updated**: 2026-03-02
**Version**: 1.0.0
