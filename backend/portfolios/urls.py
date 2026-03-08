from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PortfolioViewSet, StockViewSet, CompanyViewSet, PortfolioPCAKMeansPlotAPIView
from .analysis_view import portfolio_analysis

router = DefaultRouter()
router.register(r'portfolios', PortfolioViewSet, basename='portfolio')
router.register(r'stocks', StockViewSet, basename='stock')
router.register(r'companies', CompanyViewSet, basename='company')

urlpatterns = [
    path('', include(router.urls)),
    path('portfolios/<int:id>/analysis/', portfolio_analysis),
    path('portfolios/<int:pk>/pca-kmeans-plot/', PortfolioPCAKMeansPlotAPIView.as_view(), name='portfolio-pca-kmeans-plot'),
]
