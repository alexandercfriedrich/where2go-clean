from django.urls import path
from . import views

app_name = 'scrapers'

urlpatterns = [
    # Admin Views
    path('admin/scrapers/', views.scraper_dashboard, name='dashboard'),
    path('admin/scrapers/list/', views.scraper_list, name='list'),
    path('admin/scrapers/<uuid:scraper_id>/', views.scraper_detail, name='detail'),
    path('admin/scrapers/<uuid:scraper_id>/run/', views.run_scraper_now, name='run_now'),
    
    # REST API
    path('api/scrapers/', views.api_scrapers_list, name='api_list'),
    path('api/scrapers/<uuid:scraper_id>/run/', views.api_run_scraper, name='api_run'),
    path('api/scrapers/run/<uuid:run_id>/status/', views.api_scraper_run_status, name='api_status'),
    path('api/scrapers/stats/', views.api_scraper_stats, name='api_stats'),
]
