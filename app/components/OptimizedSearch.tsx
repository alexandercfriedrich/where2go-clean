/**
 * OptimizedSearch - Client component for live progress tracking
 * 
 * Features:
 * - Triggers POST /api/events/optimized to start job
 * - Polls /api/jobs/{jobId} every 2s for status
 * - Displays progress bar and current phase
 * - Shows "new events" badge when count increases
 * - Exposes callbacks for integration
 * - Mobile responsive design
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface EventData {
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  website: string;
  [key: string]: any;
}

interface OptimizedSearchProps {
  city: string;
  date: string;
  categories?: string[];
  onEventsUpdate?: (events: EventData[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onErrorChange?: (error: string | null) => void;
  autoStart?: boolean;
  debug?: boolean;
}

interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  events?: EventData[];
  error?: string;
  progress?: {
    phase?: number;
    completedPhases?: number;
    totalPhases?: number;
    message?: string;
  };
}

const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLLS = 60; // 2 minutes max

export default function OptimizedSearch({
  city,
  date,
  categories = [],
  onEventsUpdate,
  onLoadingChange,
  onErrorChange,
  autoStart = false,
  debug = false
}: OptimizedSearchProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'done' | 'error'>('idle');
  const [events, setEvents] = useState<EventData[]>([]);
  const [previousEventCount, setPreviousEventCount] = useState(0);
  const [showNewBadge, setShowNewBadge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    phase: number;
    totalPhases: number;
    message: string;
  }>({
    phase: 0,
    totalPhases: 4,
    message: 'Initializing...'
  });

  const pollCountRef = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start the optimized search
  const startSearch = useCallback(async () => {
    try {
      setStatus('pending');
      setError(null);
      setEvents([]);
      setPreviousEventCount(0);
      pollCountRef.current = 0;
      
      if (onLoadingChange) onLoadingChange(true);
      if (onErrorChange) onErrorChange(null);

      const response = await fetch('/api/events/optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          date,
          categories,
          options: { debug }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start search');
      }

      const data = await response.json();
      setJobId(data.jobId);
      
      if (debug) {
        console.log('[OptimizedSearch] Job started:', data.jobId);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start search';
      setError(errorMsg);
      setStatus('error');
      if (onLoadingChange) onLoadingChange(false);
      if (onErrorChange) onErrorChange(errorMsg);
    }
  }, [city, date, categories, debug, onLoadingChange, onErrorChange]);

  // Poll for job status
  useEffect(() => {
    if (!jobId || status === 'done' || status === 'error') {
      return;
    }

    const poll = async () => {
      try {
        pollCountRef.current += 1;

        if (pollCountRef.current > MAX_POLLS) {
          setError('Search timed out');
          setStatus('error');
          if (onErrorChange) onErrorChange('Search timed out');
          if (onLoadingChange) onLoadingChange(false);
          return;
        }

        const response = await fetch(`/api/jobs/${jobId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const jobStatus: JobStatus = await response.json();

        if (debug) {
          console.log('[OptimizedSearch] Job status:', jobStatus);
        }

        setStatus(jobStatus.status);

        // Update progress
        if (jobStatus.progress) {
          setProgress({
            phase: jobStatus.progress.phase ?? 0,
            totalPhases: jobStatus.progress.totalPhases ?? 4,
            message: jobStatus.progress.message ?? 'Processing...'
          });
        }

        // Update events with new badge detection
        if (jobStatus.events && jobStatus.events.length > 0) {
          setEvents(jobStatus.events);
          
          // Show "new events" badge if count increased
          if (jobStatus.events.length > previousEventCount) {
            setShowNewBadge(true);
            setPreviousEventCount(jobStatus.events.length);
            
            // Hide badge after 2 seconds
            setTimeout(() => setShowNewBadge(false), 2000);
          }

          if (onEventsUpdate) {
            onEventsUpdate(jobStatus.events);
          }
        }

        // Handle completion
        if (jobStatus.status === 'done') {
          if (onLoadingChange) onLoadingChange(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }

        // Handle error
        if (jobStatus.status === 'error') {
          setError(jobStatus.error || 'Search failed');
          if (onErrorChange) onErrorChange(jobStatus.error || 'Search failed');
          if (onLoadingChange) onLoadingChange(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error('[OptimizedSearch] Poll error:', err);
        // Don't fail on single poll error, keep trying
      }
    };

    // Start polling
    pollingIntervalRef.current = setInterval(poll, POLL_INTERVAL);
    poll(); // Immediate first poll

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [jobId, status, previousEventCount, debug, onEventsUpdate, onLoadingChange, onErrorChange]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && status === 'idle') {
      startSearch();
    }
  }, [autoStart, status, startSearch]);

  const progressPercent = progress.totalPhases > 0 
    ? Math.round((progress.phase / progress.totalPhases) * 100)
    : 0;

  const isLoading = status === 'pending' || status === 'processing';

  return (
    <div className="optimized-search-container">
      {/* Search Button */}
      {status === 'idle' && (
        <button 
          onClick={startSearch}
          className="btn-search"
          aria-label="Start optimized event search"
        >
          🚀 Optimized Search
        </button>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="search-progress" role="status" aria-live="polite">
          {/* Progress Bar */}
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          {/* Phase Info */}
          <div className="progress-info">
            <span className="phase-label">
              Phase {progress.phase} of {progress.totalPhases}
            </span>
            <span className="progress-message">{progress.message}</span>
          </div>

          {/* Event Count with Badge */}
          <div className="event-count-container">
            <span className="event-count">
              {events.length} {events.length === 1 ? 'Event' : 'Events'} gefunden
            </span>
            {showNewBadge && (
              <span className="new-badge" aria-live="polite">
                +{events.length - previousEventCount} new
              </span>
            )}
          </div>
        </div>
      )}

      {/* Completion State */}
      {status === 'done' && (
        <div className="search-complete" role="status">
          <span className="success-icon">✓</span>
          <span>Suche abgeschlossen! {events.length} Events gefunden</span>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && error && (
        <div className="search-error" role="alert">
          <span className="error-icon">⚠</span>
          <span>{error}</span>
          <button onClick={startSearch} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        .optimized-search-container {
          margin: 1rem 0;
        }

        .btn-search {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
        }

        .btn-search:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
        }

        .search-progress {
          padding: 1rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .progress-bar-container {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.75rem;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .phase-label {
          font-weight: 600;
          color: #374151;
        }

        .progress-message {
          color: #6b7280;
          font-style: italic;
        }

        .event-count-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #374151;
        }

        .event-count {
          font-weight: 500;
        }

        .new-badge {
          padding: 0.25rem 0.5rem;
          background: #10b981;
          color: white;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .search-complete {
          padding: 1rem;
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #166534;
        }

        .success-icon {
          font-size: 1.25rem;
        }

        .search-error {
          padding: 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #991b1b;
        }

        .error-icon {
          font-size: 1.25rem;
        }

        .retry-btn {
          margin-left: auto;
          padding: 0.375rem 0.75rem;
          background: white;
          border: 1px solid #dc2626;
          border-radius: 4px;
          color: #dc2626;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .retry-btn:hover {
          background: #fef2f2;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .progress-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .btn-search {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
