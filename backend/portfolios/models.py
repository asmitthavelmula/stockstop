from django.db import models
from django.core.validators import MinValueValidator
from datetime import datetime, timedelta

class Portfolio(models.Model):
    """User's investment portfolio"""
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    description = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['-created_at']


class Company(models.Model):
    """Stock company information"""
    symbol = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=255)
    sector = models.CharField(max_length=100, blank=True, null=True)
    current_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    market_cap = models.BigIntegerField(blank=True, null=True)
    pe_ratio = models.FloatField(blank=True, null=True)
    dividend_yield = models.FloatField(blank=True, null=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.symbol})"
    
    class Meta:
        ordering = ['symbol']


class Stock(models.Model):
    """Stock in a portfolio"""
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='stocks')
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    purchase_date = models.DateField()
    added_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.company.symbol} in {self.portfolio.name}"
    
    class Meta:
        unique_together = ['portfolio', 'company']
        ordering = ['-added_at']


class StockAnalysis(models.Model):
    """Stock analysis results"""
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='analyses')
    analysis_date = models.DateTimeField(auto_now_add=True)
    
    # Analysis parameters
    past_days = models.IntegerField(default=365)  # How many days of past data
    
    # Analysis results
    pe_ratio_current = models.FloatField(null=True, blank=True)
    pe_ratio_average = models.FloatField(null=True, blank=True)
    pe_ratio_min = models.FloatField(null=True, blank=True)
    pe_ratio_max = models.FloatField(null=True, blank=True)
    
    discount_percentage = models.FloatField(null=True, blank=True)  # % discount vs fair value
    opportunity_score = models.FloatField(null=True, blank=True)  # 0-100 score
    
    # Price data
    current_price = models.DecimalField(max_digits=10, decimal_places=2)
    fair_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    recommendation = models.CharField(
        max_length=20,
        choices=[
            ('STRONG_BUY', 'Strong Buy'),
            ('BUY', 'Buy'),
            ('HOLD', 'Hold'),
            ('SELL', 'Sell'),
            ('STRONG_SELL', 'Strong Sell'),
        ],
        default='HOLD'
    )
    
    def __str__(self):
        return f"Analysis of {self.stock.company.symbol} - {self.analysis_date}"
    
    class Meta:
        ordering = ['-analysis_date']


class HistoricalPrice(models.Model):
    """Historical stock price data"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='historical_prices')
    date = models.DateField()
    open_price = models.DecimalField(max_digits=10, decimal_places=2)
    high_price = models.DecimalField(max_digits=10, decimal_places=2)
    low_price = models.DecimalField(max_digits=10, decimal_places=2)
    close_price = models.DecimalField(max_digits=10, decimal_places=2)
    volume = models.BigIntegerField()
    
    class Meta:
        unique_together = ['company', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.company.symbol} - {self.date}"
