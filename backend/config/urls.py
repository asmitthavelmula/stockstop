from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('portfolios.urls')),
    path('api/gold_silver/', include('gold_silver.urls')),
]
