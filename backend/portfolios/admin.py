from django.contrib import admin
from .models import Portfolio, Company, Stock, StockAnalysis, HistoricalPrice


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'name', 'current_price', 'sector', 'pe_ratio')
    search_fields = ('symbol', 'name')
    list_filter = ('sector',)


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('company', 'portfolio', 'quantity', 'purchase_price', 'purchase_date')
    search_fields = ('company__symbol', 'portfolio__name')
    list_filter = ('portfolio', 'purchase_date')


@admin.register(StockAnalysis)
class StockAnalysisAdmin(admin.ModelAdmin):
    list_display = ('stock', 'analysis_date', 'recommendation', 'opportunity_score')
    search_fields = ('stock__company__symbol',)
    list_filter = ('recommendation', 'analysis_date')
    readonly_fields = ('analysis_date',)


@admin.register(HistoricalPrice)
class HistoricalPriceAdmin(admin.ModelAdmin):
    list_display = ('company', 'date', 'close_price', 'volume')
    search_fields = ('company__symbol',)
    list_filter = ('date', 'company')
