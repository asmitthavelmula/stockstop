from rest_framework import serializers
from .models import Portfolio, Company, Stock, StockAnalysis, HistoricalPrice


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'symbol', 'name', 'sector', 'current_price', 'market_cap', 'pe_ratio', 'dividend_yield']


class HistoricalPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricalPrice
        fields = ['date', 'open_price', 'high_price', 'low_price', 'close_price', 'volume']


class StockAnalysisSerializer(serializers.ModelSerializer):
    company = CompanySerializer(source='stock.company', read_only=True)
    
    class Meta:
        model = StockAnalysis
        fields = [
            'id', 'company', 'analysis_date', 'past_days',
            'pe_ratio_current', 'pe_ratio_average', 'pe_ratio_min', 'pe_ratio_max',
            'discount_percentage', 'opportunity_score', 'current_price', 'fair_value',
            'recommendation'
        ]


class StockDetailSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)
    analyses = StockAnalysisSerializer(many=True, read_only=True)
    current_value = serializers.SerializerMethodField()
    
    def get_current_value(self, obj):
        return float(obj.quantity) * float(obj.company.current_price)
    
    class Meta:
        model = Stock
        fields = [
            'id', 'company', 'quantity', 'purchase_price', 'purchase_date',
            'added_at', 'analyses', 'current_value'
        ]


class StockListSerializer(serializers.ModelSerializer):
    company_symbol = serializers.CharField(source='company.symbol', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    current_price = serializers.DecimalField(source='company.current_price', read_only=True, max_digits=10, decimal_places=2)
    current_value = serializers.SerializerMethodField()
    total_investment = serializers.SerializerMethodField()
    profit_loss = serializers.SerializerMethodField()
    gain_loss = serializers.SerializerMethodField()
    gain_loss_percentage = serializers.SerializerMethodField()
    pe_ratio_min = serializers.SerializerMethodField()
    pe_ratio_max = serializers.SerializerMethodField()
    
    def get_current_value(self, obj):
        return float(obj.quantity) * float(obj.company.current_price)
    
    def get_total_investment(self, obj):
        return float(obj.quantity) * float(obj.purchase_price)

    def get_profit_loss(self, obj):
        return self.get_gain_loss(obj)

    def get_gain_loss(self, obj):
        purchase_value = float(obj.quantity) * float(obj.purchase_price)
        current_value = float(obj.quantity) * float(obj.company.current_price)
        return current_value - purchase_value
    
    def get_gain_loss_percentage(self, obj):
        purchase_value = float(obj.quantity) * float(obj.purchase_price)
        current_value = float(obj.quantity) * float(obj.company.current_price)
        if purchase_value == 0:
            return 0
        return ((current_value - purchase_value) / purchase_value) * 100
    
    def get_pe_ratio_min(self, obj):
        latest = obj.analyses.first()
        return latest.pe_ratio_min if latest else None
    
    def get_pe_ratio_max(self, obj):
        latest = obj.analyses.first()
        return latest.pe_ratio_max if latest else None
    
    class Meta:
        model = Stock
        fields = [
            'id', 'company_symbol', 'company_name', 'quantity', 'purchase_price',
            'purchase_date', 'current_price', 'current_value', 'total_investment',
            'profit_loss', 'gain_loss', 'gain_loss_percentage', 'pe_ratio_min', 'pe_ratio_max'
        ]


class PortfolioDetailSerializer(serializers.ModelSerializer):
    stocks = StockListSerializer(many=True, read_only=True)
    total_value = serializers.SerializerMethodField()
    total_investment = serializers.SerializerMethodField()
    total_gain_loss = serializers.SerializerMethodField()
    total_gain_loss_percentage = serializers.SerializerMethodField()
    
    def get_total_value(self, obj):
        return sum(float(stock.quantity) * float(stock.company.current_price) for stock in obj.stocks.all())
    
    def get_total_investment(self, obj):
        return sum(float(stock.quantity) * float(stock.purchase_price) for stock in obj.stocks.all())
    
    def get_total_gain_loss(self, obj):
        total_current = self.get_total_value(obj)
        total_investment = self.get_total_investment(obj)
        return total_current - total_investment
    
    def get_total_gain_loss_percentage(self, obj):
        total_investment = self.get_total_investment(obj)
        if total_investment == 0:
            return 0
        total_gain_loss = self.get_total_gain_loss(obj)
        return (total_gain_loss / total_investment) * 100
    
    class Meta:
        model = Portfolio
        fields = [
            'id', 'name', 'description', 'created_at', 'updated_at', 'stocks',
            'total_value', 'total_investment', 'total_gain_loss', 'total_gain_loss_percentage'
        ]


class PortfolioListSerializer(serializers.ModelSerializer):
    stock_count = serializers.SerializerMethodField()
    total_value = serializers.SerializerMethodField()
    
    def get_stock_count(self, obj):
        return obj.stocks.count()
    
    def get_total_value(self, obj):
        return sum(float(stock.quantity) * float(stock.company.current_price) for stock in obj.stocks.all())
    
    class Meta:
        model = Portfolio
        fields = ['id', 'name', 'description', 'created_at', 'stock_count', 'total_value']


class StockCreateUpdateSerializer(serializers.ModelSerializer):
    company_symbol = serializers.CharField(write_only=True)
    company = CompanySerializer(read_only=True)
    
    def create(self, validated_data):
        symbol = validated_data.pop('company_symbol')
        company, _ = Company.objects.get_or_create(symbol=symbol, defaults={'name': symbol})
        validated_data['company'] = company
        return super().create(validated_data)
    
    class Meta:
        model = Stock
        fields = ['company', 'company_symbol', 'quantity', 'purchase_price', 'purchase_date']
