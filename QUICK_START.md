# StockKK Analysis - Quick Start Guide

## 🎯 Quick Setup (5 minutes)

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows:
venv\Scripts\activate

# Alternative: use helper scripts from repository root
# PowerShell (dot-source so activation affects current shell):
. .\scripts\ensure_venv.ps1

# cmd.exe / Command Prompt (call to affect current shell):
call .\scripts\ensure_venv.bat
# macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Apply migrations
python manage.py migrate

# 6. Run server
python manage.py runserver
```

Your backend will run at: **http://localhost:8000**

### Frontend Setup

```bash
# 1. Navigate to frontend (in another terminal)
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm start
```

Your frontend will open at: **http://localhost:3000**

---

## 📋 Step-by-Step User Guide

### 1️⃣ Creating a Portfolio

1. Open **http://localhost:3000** in your browser
2. Click **"Create New Portfolio"** button
3. Enter:
   - **Portfolio Name** (e.g., "My First Portfolio")
   - **Description** (optional)
4. Click **"Create Portfolio"**

### 2️⃣ Adding Stocks to Portfolio

1. Click on your portfolio card
2. Click **"Add Stock"** button
3. Enter stock symbol (e.g., **AAPL**, **GOOGL**, **MSFT**)
4. Click **"Search"** to fetch current price and company info
5. Enter:
   - **Quantity**: Number of shares
   - **Purchase Price**: Price you paid per share
   - **Purchase Date**: When you bought
6. Click **"Add Stock"**

**Example:**
- Symbol: AAPL
- Quantity: 10
- Purchase Price: 150.00
- Purchase Date: 2023-01-15

### 3️⃣ Analyzing a Stock

1. In your portfolio, find the stock you want to analyze
2. Click the **📊** button to expand the row
3. Select analysis period:
   - **30D** - Last month
   - **90D** - Last 3 months
   - **180D** - Last 6 months
   - **365D** - Last year
4. Click **"Start Analysis"**
5. Once complete, click **"View Analysis Results →"**

### 4️⃣ Understanding the Analysis

**Three Key Charts:**

1. **PE Ratio Analysis Graph**
   - Shows Current, Average, Min, and Max P/E ratios
   - Helps identify if stock is overvalued or undervalued
   - Lower P/E = potentially better value

2. **Discount Analysis Graph**
   - Compares current price vs fair value
   - Shows percentage discount
   - Green/high discount = buying opportunity

3. **Opportunity Score Graph**
   - 0-100 rating of investment opportunity
   - Higher score = better opportunity
   - Based on discount and historical performance

**Recommendation Badges:**
- 🟢 **STRONG BUY** - Excellent opportunity
- 🟢 **BUY** - Good opportunity
- 🟡 **HOLD** - Wait for better price
- 🔴 **SELL** - Consider selling
- 🔴 **STRONG SELL** - Liquidate position

---

## 💡 Example Workflow

```
1. Create Portfolio "Tech Stocks"
   ↓
2. Add Stock AAPL
   - Quantity: 5
   - Purchase Price: 150.00
   ↓
3. Add Stock GOOGL
   - Quantity: 3
   - Purchase Price: 2800.00
   ↓
4. Click on AAPL and analyze (365 days)
   ↓
5. View charts and recommendation
   ↓
6. Repeat for GOOGL
   ↓
7. Monitor portfolio value and gains
```

---

## 🔍 Understanding Portfolio Dashboard

### Performance Metrics

**Total Value**: Current market value of all stocks
**Total Investment**: Total amount you've invested
**Total Gain/Loss**: Profit/loss in dollars
**Gain/Loss %**: Percentage return on investment

### Stock Table Columns

- **Symbol**: Stock ticker (AAPL, GOOGL, etc.)
- **Company**: Full company name
- **Quantity**: Number of shares
- **Purchase Price**: Price you paid per share
- **Current Price**: Today's price
- **Current Value**: Quantity × Current Price
- **Gain/Loss**: Total profit/loss
- **Gain/Loss %**: Percentage return

---

## 🐛 Troubleshooting

### "Stock not found"
- Check spelling of ticker symbol
- Ensure it's a valid public company
- Try searching on Yahoo Finance

### "Error connecting to API"
- Make sure Django backend is running (`python manage.py runserver`)
- Check that frontend is set to correct API URL
- Look at browser console (F12) for errors

### "No historical data"
- Stock needs at least 30 days of trading history
- Try a different stock or longer company
- Wait a few moments and refresh

### Charts not appearing
- Ensure analysis is complete
- Try refreshing the page
- Check browser console for JavaScript errors

---

## 🛠️ Useful Commands

```bash
# Backend
python manage.py migrate          # Apply database migrations
python manage.py createsuperuser  # Create admin account
python manage.py shell            # Django shell for debugging

# Frontend
npm start                          # Start dev server
npm build                          # Build for production
npm test                           # Run tests
```

---

## 📊 Tips for Best Results

✅ **DO:**
- Start with analysis period of 365 days for long-term trends
- Monitor portfolios regularly
- Check recommendations before trading
- Use multiple portfolios for different strategies

❌ **DON'T:**
- Use very short analysis periods (analysis becomes noisy)
- Rely solely on recommendations (do your own research)
- Forget to refresh prices after market close
- Over-trade based on short-term signals

---

## 🎓 Learning Resources

- **P/E Ratio**: [Investopedia](https://www.investopedia.com/terms/p/price-earningsratio.asp)
- **Stock Valuation**: [Khan Academy](https://www.khanacademy.org/)
- **Yahoo Finance**: [yfinance library](https://finance.yahoo.com/)

---

## 📞 Need Help?

1. Check the main **README.md** for technical details
2. Review API endpoints in documentation
3. Check Django logs: `python manage.py runserver`
4. Check browser console: `F12` in Chrome/Firefox

---

**Happy Investing! 🚀📈**
