from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required, permission_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import ScraperRegistry, ScraperRun, ScraperLog, ScraperSchedule
from datetime import datetime
import importlib


@login_required
@permission_required('auth.is_staff')
def scraper_dashboard(request):
    """
    Main scraper management dashboard.
    """
    scrapers = ScraperRegistry.objects.all()
    recent_runs = ScraperRun.objects.select_related('scraper').order_by('-created_at')[:10]
    running_runs = ScraperRun.objects.filter(status='running')
    
    # Calculate statistics
    total_runs = ScraperRun.objects.count()
    successful_runs = ScraperRun.objects.filter(status='completed').count()
    failed_runs = ScraperRun.objects.filter(status='failed').count()
    
    context = {
        'scrapers': scrapers,
        'recent_runs': recent_runs,
        'running_runs': running_runs,
        'stats': {
            'total_scrapers': scrapers.count(),
            'active_scrapers': scrapers.filter(is_active=True).count(),
            'total_runs': total_runs,
            'successful_runs': successful_runs,
            'failed_runs': failed_runs,
            'success_rate': (successful_runs / total_runs * 100) if total_runs > 0 else 0,
        }
    }
    
    return render(request, 'admin/scraper_dashboard.html', context)


@login_required
@permission_required('auth.is_staff')
def scraper_list(request):
    """
    List all scrapers with stats.
    """
    scrapers = ScraperRegistry.objects.prefetch_related('runs').all()
    
    scraper_list = []
    for scraper in scrapers:
        runs = scraper.runs.all()
        scraper_list.append({
            'id': scraper.id,
            'name': scraper.display_name,
            'status': scraper.status,
            'is_active': scraper.is_active,
            'total_runs': runs.count(),
            'last_run': runs.first(),
        })
    
    context = {'scrapers': scraper_list}
    return render(request, 'admin/scraper_list.html', context)


@login_required
@permission_required('auth.is_staff')
def scraper_detail(request, scraper_id):
    """
    Detailed view of a single scraper.
    """
    scraper = get_object_or_404(ScraperRegistry, id=scraper_id)
    runs = scraper.runs.all()[:20]
    
    stats = {
        'total_runs': scraper.runs.count(),
        'completed': scraper.runs.filter(status='completed').count(),
        'failed': scraper.runs.filter(status='failed').count(),
    }
    
    context = {
        'scraper': scraper,
        'runs': runs,
        'stats': stats,
        'schedule': getattr(scraper, 'schedule', None),
    }
    
    return render(request, 'admin/scraper_detail.html', context)


@login_required
@permission_required('auth.is_staff')
@require_http_methods(["POST"])
def run_scraper_now(request, scraper_id):
    """
    Trigger a scraper to run immediately.
    """
    scraper = get_object_or_404(ScraperRegistry, id=scraper_id)
    
    if not scraper.is_active:
        return JsonResponse({'error': 'Scraper is not active'}, status=400)
    
    try:
        # Create scraper run record
        run = ScraperRun.objects.create(
            scraper=scraper,
            status='pending',
            triggered_by='manual',
            parameters={}
        )
        
        # Import and run scraper
        module = importlib.import_module(scraper.module_path)
        scraper_class = getattr(module, scraper.class_name)
        scraper_instance = scraper_class(
            delay=scraper.default_delay,
            timeout=scraper.timeout
        )
        
        # Execute scraping
        run.status = 'running'
        run.started_at = datetime.now()
        run.save()
        
        result = scraper_instance.start_scraping()
        
        # Update run with results
        run.status = 'completed' if result.get('success') else 'failed'
        run.completed_at = datetime.now()
        run.items_found = result.get('items_found', 0)
        run.items_saved = result.get('items_saved', 0)
        run.errors = result.get('errors', 0)
        run.message = result.get('message', '')
        run.duration = (run.completed_at - run.started_at).total_seconds()
        run.result_data = result.get('data', [])
        run.save()
        
        return JsonResponse({
            'success': True,
            'run_id': str(run.id),
            'status': run.status,
            'items_found': run.items_found,
        })
        
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=500)


# REST API Endpoints

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def api_scrapers_list(request):
    """
    API: List all scrapers.
    """
    scrapers = ScraperRegistry.objects.all()
    data = []
    
    for scraper in scrapers:
        runs = scraper.runs.all()
        data.append({
            'id': str(scraper.id),
            'name': scraper.display_name,
            'status': scraper.status,
            'is_active': scraper.is_active,
            'stats': {
                'total_runs': runs.count(),
                'successful': runs.filter(status='completed').count(),
                'failed': runs.filter(status='failed').count(),
            }
        })
    
    return Response(data)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def api_run_scraper(request, scraper_id):
    """
    API: Start a scraper run.
    """
    scraper = get_object_or_404(ScraperRegistry, id=scraper_id)
    
    try:
        run = ScraperRun.objects.create(
            scraper=scraper,
            status='pending',
            triggered_by='api',
            parameters=request.data.get('parameters', {})
        )
        
        return Response({
            'success': True,
            'run_id': str(run.id),
            'message': f'Scraper {scraper.display_name} started'
        }, status=status.HTTP_202_ACCEPTED)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def api_scraper_run_status(request, run_id):
    """
    API: Get status of a scraper run.
    """
    run = get_object_or_404(ScraperRun, id=run_id)
    
    return Response({
        'status': run.status,
        'items_found': run.items_found,
        'items_saved': run.items_saved,
        'items_updated': run.items_updated,
        'errors': run.errors,
        'duration': run.duration,
        'message': run.message,
    })


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def api_scraper_stats(request):
    """
    API: Get overall scraper statistics.
    """
    total_runs = ScraperRun.objects.count()
    successful_runs = ScraperRun.objects.filter(status='completed').count()
    failed_runs = ScraperRun.objects.filter(status='failed').count()
    
    return Response({
        'total_runs': total_runs,
        'successful_runs': successful_runs,
        'failed_runs': failed_runs,
        'success_rate': (successful_runs / total_runs * 100) if total_runs > 0 else 0,
    })
