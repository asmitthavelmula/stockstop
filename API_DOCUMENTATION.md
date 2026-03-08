# API Documentation

## Base URL
```
http://localhost:8000/api
```

## Portfolio Endpoints

### 1. List All Portfolios
```
GET /portfolios/
```
**Response:**
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "My Portfolio",
      "description": "Investment portfolio",
      "created_at": "2023-01-15T10:30:00Z",
      "stock_count": 5,
      "total_value": 15000.50
    }
  ]
}
```

### 2. Get Portfolio Details
```
GET /portfolios/{id}/
```
**Response:**
```json
{
  "id": 1,
  "name": "My Portfolio",
  "description": "Investment portfolio",
  "created_at": "2023-01-15T10:30:00Z",
  "updated_at": "2023-12-01T15:45:00Z",
  "stocks": [
    {
      "id": 1,
      "company_symbol": "AAPL",
      "company_name": "Apple Inc.",
      "quantity": 10,
      "purchase_price": "150.00",
      "purchase_date": "2023-01-15",
      "current_price": "175.50",
      "current_value": 1755.00,
      "gain_loss": 255.00,
      "gain_loss_percentage": 17.00
    }
  ],
  "total_value": 15000.50,
  "total_investment": 12000.00,
  "total_gain_loss": 3000.50,
  "total_gain_loss_percentage": 25.00
}
```

### 3. Create Portfolio
```
POST /portfolios/
```
**Request Body:**
```json
{
  "name": "My Portfolio",
  "description": "Investment portfolio"
}
```
**Response:** (201 Created)
```json
{
  "id": 1,
  "name": "My Portfolio",
  "description": "Investment portfolio",
  "created_at": "2023-01-15T10:30:00Z",
  "updated_at": "2023-01-15T10:30:00Z",
  "stocks": [],
  "total_value": 0.00,
  "total_investment": 0.00,
  "total_gain_loss": 0.00,
  "total_gain_loss_percentage": 0.00
}
```

### 4. Update Portfolio
```
PUT /portfolios/{id}/
```
**Request Body:**
```json
{
  "name": "Updated Portfolio Name",
  "description": "Updated description"
}
```

### 5. Delete Portfolio
```
DELETE /portfolios/{id}/
```
**Response:** (204 No Content)

### 6. Add Stock to Portfolio
```
POST /portfolios/{id}/add_stock/
```
**Request Body:**
```json
{
  "symbol": "AAPL",
  "quantity": 10,
  "purchase_price": 150.00,
  "purchase_date": "2023-01-15"
}
```
**Response:** (201 Created)
```json
{
  "id": 1,
  "company": {
    "id": 1,
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "sector": "Technology",
    "current_price": "175.50",
    "market_cap": 2800000000000,
    "pe_ratio": 25.5,
    "dividend_yield": 0.005
  },
  "quantity": 10,
  "purchase_price": "150.00",
  "purchase_date": "2023-01-15",
  "added_at": "2023-12-01T15:45:00Z",
  "analyses": [],
  "current_value": 1755.00
}
```

---

## Stock Endpoints

### 1. List Stocks (by Portfolio)
```
GET /stocks/?portfolio_id={portfolio_id}
```
**Response:**
```json
[
  {
    "id": 1,
    "company_symbol": "AAPL",
    "company_name": "Apple Inc.",
    "quantity": 10,
    "purchase_price": "150.00",
    "purchase_date": "2023-01-15",
    "current_price": "175.50",
    "current_value": 1755.00,
    "gain_loss": 255.00,
    "gain_loss_percentage": 17.00
  }
]
```

### 2. Get Stock Details
```
GET /stocks/{id}/
```
**Response:**
```json
{
  "id": 1,
  "company": {
    "id": 1,
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "sector": "Technology",
    "current_price": "175.50",
    "market_cap": 2800000000000,
    "pe_ratio": 25.5,
    "dividend_yield": 0.005
  },
  "quantity": 10,
  "purchase_price": "150.00",
  "purchase_date": "2023-01-15",
  "added_at": "2023-12-01T15:45:00Z",
  "analyses": [
    {
      "id": 1,
      "company": {...},
      "analysis_date": "2023-12-01T16:00:00Z",
      "past_days": 365,
      "pe_ratio_current": 25.5,
      "pe_ratio_average": 22.0,
      "pe_ratio_min": 18.5,
      "pe_ratio_max": 28.0,
      "discount_percentage": 15.5,
      "opportunity_score": 72.5,
      "current_price": "175.50",
      "fair_value": "202.50",
      "recommendation": "BUY"
    }
  ],
  "current_value": 1755.00
}
```

### 3. Analyze Stock
```
POST /stocks/{id}/analyze/
```
**Request Body:**
```json
{
  "past_days": 365
}
```
**Response:** (200 OK)
```json
{
  "id": 1,
  "company": {
    "id": 1,
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "sector": "Technology",
    "current_price": "175.50",
    "market_cap": 2800000000000,
    "pe_ratio": 25.5,
    "dividend_yield": 0.005
  },
  "analysis_date": "2023-12-01T16:00:00Z",
  "past_days": 365,
  "pe_ratio_current": 25.5,
  "pe_ratio_average": 22.0,
  "pe_ratio_min": 18.5,
  "pe_ratio_max": 28.0,
  "discount_percentage": 15.5,
  "opportunity_score": 72.5,
  "current_price": "175.50",
  "fair_value": "202.50",
  "recommendation": "BUY"
}
```

**Available past_days values:**
- 30 (last month)
- 90 (last 3 months)
- 180 (last 6 months)
- 365 (last year)
- Any positive integer for custom periods

### 4. Get Price History
```
GET /stocks/{id}/price_history/?past_days=365
```
**Response:** (200 OK)
```json
{
  "prices": [
    {
      "date": "2022-12-01",
      "price": 145.50
    },
    {
      "date": "2022-12-02",
      "price": 148.75
    },
    ...
  ]
}
```

### 5. Get Latest Analysis with Charts Data
```
GET /stocks/{id}/latest_analysis/
```
**Response:** (200 OK)
```json
{
  "id": 1,
  "company": {...},
  "analysis_date": "2023-12-01T16:00:00Z",
  "past_days": 365,
  "pe_ratio_current": 25.5,
  "pe_ratio_average": 22.0,
  "pe_ratio_min": 18.5,
  "pe_ratio_max": 28.0,
  "discount_percentage": 15.5,
  "opportunity_score": 72.5,
  "current_price": "175.50",
  "fair_value": "202.50",
  "recommendation": "BUY",
  "price_history": [
    {
      "date": "2022-12-01",
      "price": 145.50
    },
    ...
  ]
}
```

### 6. Delete Stock
```
DELETE /stocks/{id}/
```
**Response:** (204 No Content)

---

## Company Endpoints

### 1. Search Company by Symbol
```
GET /companies/search/?symbol=AAPL
```
**Response:** (200 OK)
```json
{
  "id": 1,
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "sector": "Technology",
  "current_price": "175.50",
  "market_cap": 2800000000000,
  "pe_ratio": 25.5,
  "dividend_yield": 0.005
}
```

### 2. List All Companies
```
GET /companies/
```
**Response:**
```json
[
  {
    "id": 1,
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "sector": "Technology",
    "current_price": "175.50",
    "market_cap": 2800000000000,
    "pe_ratio": 25.5,
    "dividend_yield": 0.005
  },
  ...
]
```

### 3. Get Company Details
```
GET /companies/{id}/
```
**Response:**
```json
{
  "id": 1,
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "sector": "Technology",
  "current_price": "175.50",
  "market_cap": 2800000000000,
  "pe_ratio": 25.5,
  "dividend_yield": 0.005
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 404 Not Found
```json
{
  "error": "Portfolio not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Server error message"
}
```

---

## Data Types

### Decimal Fields
- `current_price`: Decimal with 2 decimal places
- `purchase_price`: Decimal with 2 decimal places
- `fair_value`: Decimal with 2 decimal places

### Float Fields
- `pe_ratio_current`: Float
- `pe_ratio_average`: Float
- `discount_percentage`: Float
- `opportunity_score`: Float (0-100)

### Integer Fields
- `quantity`: Positive integer
- `past_days`: Positive integer
- `market_cap`: Long integer
- `volume`: Long integer

### Date Fields
- `purchase_date`: YYYY-MM-DD format
- `date` (Historical): YYYY-MM-DD format

### DateTime Fields
- `created_at`: ISO 8601 format with timezone
- `updated_at`: ISO 8601 format with timezone
- `analysis_date`: ISO 8601 format with timezone

---

## Authentication

Currently, the API allows anonymous access. For production:

1. Implement JWT or Token-based authentication
2. Add user-specific portfolio filtering
3. Implement rate limiting

---

## Pagination

List endpoints support pagination:
```
GET /portfolios/?page=1
```

Response includes:
- `count`: Total number of items
- `next`: URL to next page
- `previous`: URL to previous page
- `results`: Array of items

---

## Filtering

Some endpoints support filtering:
```
GET /stocks/?portfolio_id=1
GET /companies/search/?symbol=AAPL
```

---

## Testing with cURL

### Create Portfolio
```bash
curl -X POST http://localhost:8000/api/portfolios/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Portfolio", "description": "Test"}'
```

### Add Stock
```bash
curl -X POST http://localhost:8000/api/portfolios/1/add_stock/ \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "quantity": 10,
    "purchase_price": 150.00,
    "purchase_date": "2023-01-15"
  }'
```

### Analyze Stock
```bash
curl -X POST http://localhost:8000/api/stocks/1/analyze/ \
  -H "Content-Type: application/json" \
  -d '{"past_days": 365}'
```

### Get Latest Analysis
```bash
curl http://localhost:8000/api/stocks/1/latest_analysis/
```

---

## Rate Limits

Currently no rate limiting is implemented. For production:
- Implement rate limiting (e.g., 100 requests/hour per IP)
- Add throttling for expensive operations like analysis
- Cache results when possible

---

## Best Practices

1. **Error Handling**: Always check response status code
2. **Caching**: Cache company data when possible
3. **Batch Operations**: Group portfolio operations when possible
4. **Data Validation**: Validate input on client-side before sending
5. **Error Messages**: Read error messages for debugging
