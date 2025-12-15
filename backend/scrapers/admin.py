from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Q
from .models import ScraperRegistry, ScraperRun, ScraperLog, ScraperSchedule


@admin.register(ScraperRegistry)
class ScraperRegistryAdmin(admin.ModelAdmin):
    """
    Admin interface for scraper registry.
    """
    list_display = ('display_name', 'status_badge', 'is_active', 'last_run_info', 'run_count', 'actions')
    list_filter = ('status', 'is_active', 'created_at')
    search_fields = ('display_name', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('General', {
            'fields': ('id', 'scraper_key', 'display_name', 'description')
        }),
        ('Configuration', {
            'fields': ('module_path', 'class_name', 'website', 'status', 'is_active')
        }),
        ('Execution', {
            'fields': ('default_delay', 'timeout', 'max_retries')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        colors = {
            'available': 'green',
            'disabled': 'red',
            'maintenance': 'orange',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def last_run_info(self, obj):
        last_run = obj.runs.first()
        if last_run:
            status_color = 'green' if last_run.status == 'completed' else 'red'
            return format_html(
                '<span style="color: {};">{} ({}) - {}</span>',
                status_color,
                last_run.status.upper(),
                last_run.created_at.strftime('%Y-%m-%d %H:%M'),
                f"{last_run.items_found} items"
            )
        return 'No runs'
    last_run_info.short_description = 'Last Run'
    
    def run_count(self, obj):
        total = obj.runs.count()
        completed = obj.runs.filter(status='completed').count()
        return format_html(
            '<span>{} total | {} completed</span>',
            total,
            completed
        )
    run_count.short_description = 'Runs'
    
    def actions(self, obj):
        return format_html(
            '<a class="button" href="#">Run Now</a> '
            '<a class="button" href="#">View Runs</a>'
        )
    actions.short_description = 'Actions'
    
    def has_add_permission(self, request):
        return True
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(ScraperRun)
class ScraperRunAdmin(admin.ModelAdmin):
    """
    Admin interface for scraper runs.
    """
    list_display = ('scraper_name', 'status_badge', 'triggered_by', 'items_found', 'duration_display', 'created_at')
    list_filter = ('status', 'triggered_by', 'scraper', 'created_at')
    search_fields = ('scraper__display_name', 'message')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Run Info', {
            'fields': ('id', 'scraper', 'status', 'triggered_by')
        }),
        ('Execution', {
            'fields': ('started_at', 'completed_at', 'duration')
        }),
        ('Results', {
            'fields': ('items_found', 'items_saved', 'items_updated', 'errors')
        }),
        ('Messages', {
            'fields': ('message', 'error_message')
        }),
        ('Parameters & Data', {
            'fields': ('parameters', 'result_data'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def scraper_name(self, obj):
        return obj.scraper.display_name
    scraper_name.short_description = 'Scraper'
    
    def status_badge(self, obj):
        colors = {
            'completed': 'green',
            'failed': 'red',
            'running': 'blue',
            'pending': 'gray',
            'cancelled': 'orange',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def duration_display(self, obj):
        if obj.duration:
            return f"{obj.duration:.2f}s"
        return "-"
    duration_display.short_description = 'Duration'
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ScraperLog)
class ScraperLogAdmin(admin.ModelAdmin):
    """
    Admin interface for scraper logs.
    """
    list_display = ('run_scraper', 'level_badge', 'message_preview', 'created_at')
    list_filter = ('level', 'run__scraper', 'created_at')
    search_fields = ('message', 'run__scraper__display_name')
    readonly_fields = ('id', 'created_at')
    
    fieldsets = (
        ('Log Entry', {
            'fields': ('id', 'run', 'level', 'message')
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def run_scraper(self, obj):
        return obj.run.scraper.display_name
    run_scraper.short_description = 'Scraper'
    
    def level_badge(self, obj):
        colors = {
            'DEBUG': 'gray',
            'INFO': 'blue',
            'WARNING': 'orange',
            'ERROR': 'red',
            'CRITICAL': 'darkred',
        }
        color = colors.get(obj.level, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color,
            obj.level
        )
    level_badge.short_description = 'Level'
    
    def message_preview(self, obj):
        return obj.message[:100]
    message_preview.short_description = 'Message'
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ScraperSchedule)
class ScraperScheduleAdmin(admin.ModelAdmin):
    """
    Admin interface for scraper schedules.
    """
    list_display = ('scraper_name', 'frequency', 'is_active', 'last_run_display', 'next_run_display')
    list_filter = ('is_active', 'frequency')
    search_fields = ('scraper__display_name',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Schedule', {
            'fields': ('id', 'scraper', 'frequency', 'is_active')
        }),
        ('Execution', {
            'fields': ('last_run', 'next_run')
        }),
        ('Parameters', {
            'fields': ('parameters',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def scraper_name(self, obj):
        return obj.scraper.display_name
    scraper_name.short_description = 'Scraper'
    
    def last_run_display(self, obj):
        if obj.last_run:
            return obj.last_run.strftime('%Y-%m-%d %H:%M')
        return 'Never'
    last_run_display.short_description = 'Last Run'
    
    def next_run_display(self, obj):
        if obj.next_run:
            return obj.next_run.strftime('%Y-%m-%d %H:%M')
        return 'Not scheduled'
    next_run_display.short_description = 'Next Run'
