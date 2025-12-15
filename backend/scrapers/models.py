from django.db import models
import uuid

class ScraperRegistry(models.Model):
    """
    Registry of all available scrapers.
    """
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('disabled', 'Disabled'),
        ('maintenance', 'Maintenance'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scraper_key = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    module_path = models.CharField(max_length=255)
    class_name = models.CharField(max_length=100)
    website = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    is_active = models.BooleanField(default=True)
    default_delay = models.FloatField(default=2.0, help_text='Delay between requests in seconds')
    timeout = models.IntegerField(default=10, help_text='Request timeout in seconds')
    max_retries = models.IntegerField(default=3)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'scraper_registry'
        ordering = ['display_name']
    
    def __str__(self):
        return f"{self.display_name} ({self.status})"


class ScraperRun(models.Model):
    """
    Track individual scraper executions.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    TRIGGER_CHOICES = [
        ('manual', 'Manual'),
        ('scheduled', 'Scheduled'),
        ('api', 'API Call'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scraper = models.ForeignKey(ScraperRegistry, on_delete=models.CASCADE, related_name='runs')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    duration = models.FloatField(blank=True, null=True, help_text='Duration in seconds')
    items_found = models.IntegerField(default=0)
    items_saved = models.IntegerField(default=0)
    items_updated = models.IntegerField(default=0)
    errors = models.IntegerField(default=0)
    parameters = models.JSONField(default=dict, blank=True)
    message = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    result_data = models.JSONField(default=dict, blank=True)
    triggered_by = models.CharField(max_length=50, choices=TRIGGER_CHOICES, default='manual')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'scraper_run'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.scraper.display_name} - {self.status}"


class ScraperLog(models.Model):
    """
    Detailed logging for scraper runs.
    """
    LEVEL_CHOICES = [
        ('DEBUG', 'Debug'),
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('CRITICAL', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(ScraperRun, on_delete=models.CASCADE, related_name='logs')
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='INFO')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'scraper_log'
        ordering = ['created_at']
    
    def __str__(self):
        return f"[{self.level}] {self.message[:50]}"


class ScraperSchedule(models.Model):
    """
    Scheduling configuration for scrapers.
    """
    FREQUENCY_CHOICES = [
        ('once', 'One-time'),
        ('hourly', 'Hourly'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scraper = models.OneToOneField(ScraperRegistry, on_delete=models.CASCADE, related_name='schedule')
    is_active = models.BooleanField(default=True)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='daily')
    next_run = models.DateTimeField(blank=True, null=True)
    last_run = models.DateTimeField(blank=True, null=True)
    parameters = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'scraper_schedule'
    
    def __str__(self):
        return f"{self.scraper.display_name} - {self.frequency}"
