/**
 * OptimizedSearch - Streaming-enabled client component with live progress tracking
 * 
 * Features:
 * - Connects to POST /api/events/optimized NDJSON streaming endpoint
 * - Processes streaming NDJSON responses in real-time
 * - Shows live notifications for each phase update
 * - Updates event list immediately as new events arrive
 * - Displays progress bar with phase information
 * - Shows toast notifications for new event batches
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
  onPhaseUpdate?: (phase: number, totalPhases: number, message: string) => void;
  autoStart?: boolean;
  debug?: boolean;
}

// NDJSON message types from backend
type StreamMessage = 
  | { type: 'phase'; phase: number; totalPhases: number; message: string; timestamp: number }
  | { type: 'events'; phase: number; events: EventData[]; totalEvents: number; timestamp: number }
  | { type: 'complete'; totalEvents: number; events: EventData[]; timestamp: number }
  | { type: 'error'; error: string; timestamp: number };

export default function OptimizedSearch({
  city,
  date,
  categories = [],
  onEventsUpdate,
  onLoadingChange,
  onErrorChange,
  onPhaseUpdate,
  autoStart = false,
  debug = false
}: OptimizedSearchProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [events, setEvents] = useState<EventData[]>([]);
  const [previousEventCount, setPreviousEventCount] = useState(0);
  const [showNewBadge, setShowNewBadge] = useState(false);
  const [newEventCount, setNewEventCount] = useState(0);
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

  const abortControllerRef = useRef<AbortController | null>(null);

  // Parse NDJSON stream
  const parseNDJSON = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (debug) {
            console.log('[OptimizedSearch:Stream] Stream ended');
          }
          break;
        }

        // Append to buffer and process complete lines
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        // Process each complete line
        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const message: StreamMessage = JSON.parse(line);
            
            // Validate message type
            if (!message.type || !['phase', 'events', 'complete', 'error'].includes(message.type)) {
              console.warn('[OptimizedSearch:Stream] Invalid message type:', message);
              continue;
            }
            
            if (debug) {
              console.log('[OptimizedSearch:Stream] Message:', message);
            }

            switch (message.type) {
              case 'phase':
                setProgress({
                  phase: message.phase,
                  totalPhases: message.totalPhases,
                  message: message.message
                });
                if (onPhaseUpdate) {
                  onPhaseUpdate(message.phase, message.totalPhases, message.message);
                }
                break;

              case 'events':
                setEvents(prevEvents => {
                  const newEvents = [...prevEvents, ...message.events];
                  
                  // Show "new events" badge
                  if (message.events.length > 0) {
                    setNewEventCount(message.events.length);
                    setShowNewBadge(true);
                    setTimeout(() => setShowNewBadge(false), 3000);
                  }

                  if (onEventsUpdate) {
                    onEventsUpdate(newEvents);
                  }

                  return newEvents;
                });
                break;

              case 'complete':
                setStatus('done');
                setEvents(message.events);
                setProgress({
                  phase: 4,
                  totalPhases: 4,
                  message: `Complete! Found ${message.totalEvents} unique events`
                });
                if (onEventsUpdate) {
                  onEventsUpdate(message.events);
                }
                if (onLoadingChange) {
                  onLoadingChange(false);
                }
                // Clear abort controller to allow new searches
                abortControllerRef.current = null;
                break;

              case 'error':
                setStatus('error');
                setError(message.error);
                if (onErrorChange) {
                  onErrorChange(message.error);
                }
                if (onLoadingChange) {
                  onLoadingChange(false);
                }
                // Clear abort controller to allow new searches
                abortControllerRef.current = null;
                break;
            }
          } catch (parseError) {
            // Enhanced error handling - log but continue processing other lines
            if (debug) {
              console.error('[OptimizedSearch:Stream] Parse error for line:', line, parseError);
            }
            // Continue processing other lines
          }
        }
      }
    } catch (streamError) {
      if (streamError instanceof Error && streamError.name === 'AbortError') {
        if (debug) {
          console.log('[OptimizedSearch:Stream] Aborted');
        }
        setStatus('idle');
        if (onLoadingChange) {
          onLoadingChange(false);
        }
      } else {
        console.error('[OptimizedSearch:Stream] Stream error:', streamError);
        setStatus('error');
        setError('Stream connection error');
        if (onErrorChange) {
          onErrorChange('Stream connection error');
        }
        if (onLoadingChange) {
          onLoadingChange(false);
        }
      }
    }
  }, [debug, onEventsUpdate, onPhaseUpdate, onLoadingChange, onErrorChange]);

  // Start the optimized search with streaming
  const startSearch = useCallback(async () => {
    try {
      // Abort any existing search
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Reset state
      setStatus('loading');
      setError(null);
      setEvents([]);
      setPreviousEventCount(0);
      setShowNewBadge(false);
      setNewEventCount(0);
      setProgress({
        phase: 0,
        totalPhases: 4,
        message: 'Starting search...'
      });
      
      if (onLoadingChange) onLoadingChange(true);
      if (onErrorChange) onErrorChange(null);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/events/optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          date,
          categories,
          options: { debug }
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      if (debug) {
        console.log('[OptimizedSearch] Streaming started');
      }

      // Process NDJSON stream
      const reader = response.body.getReader();
      await parseNDJSON(reader);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (debug) {
          console.log('[OptimizedSearch] Search aborted');
        }
        setStatus('idle');
        if (onLoadingChange) onLoadingChange(false);
        abortControllerRef.current = null;
        return;
      }

      const errorMsg = err instanceof Error ? err.message : 'Failed to start search';
      setError(errorMsg);
      setStatus('error');
      if (onLoadingChange) onLoadingChange(false);
      if (onErrorChange) onErrorChange(errorMsg);
      abortControllerRef.current = null;
      console.error('[OptimizedSearch] Error:', err);
    }
  }, [city, date, categories, debug, onLoadingChange, onErrorChange, parseNDJSON]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && status === 'idle') {
      startSearch();
    }
  }, [autoStart, status, startSearch]);

  const progressPercent = progress.totalPhases > 0 
    ? Math.round((progress.phase / progress.totalPhases) * 100)
    : 0;

  const isLoading = status === 'loading';

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

      {/* Loading State with Live Updates */}
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
            {showNewBadge && newEventCount > 0 && (
              <span className="new-badge" aria-live="polite">
                +{newEventCount} new!
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
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .progress-bar-container {
          width: 100%;
          height: 10px;
          background: #e5e7eb;
          border-radius: 5px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
        }

        .phase-label {
          font-weight: 700;
          color: #374151;
          font-size: 0.95rem;
        }

        .progress-message {
          color: #6b7280;
          font-style: italic;
          text-align: right;
          flex: 1;
          margin-left: 1rem;
        }

        .event-count-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.95rem;
          color: #374151;
        }

        .event-count {
          font-weight: 600;
        }

        .new-badge {
          padding: 0.35rem 0.75rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: 16px;
          font-size: 0.8rem;
          font-weight: 700;
          animation: slideInBounce 0.5s ease;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
        }

        @keyframes slideInBounce {
          0% {
            opacity: 0;
            transform: translateX(-20px) scale(0.8);
          }
          60% {
            opacity: 1;
            transform: translateX(5px) scale(1.05);
          }
          100% {
            transform: translateX(0) scale(1);
          }
        }

        .search-complete {
          padding: 1.25rem;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid #86efac;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #166534;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .success-icon {
          font-size: 1.5rem;
        }

        .search-error {
          padding: 1.25rem;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 2px solid #fecaca;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #991b1b;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
        }

        .error-icon {
          font-size: 1.5rem;
        }

        .retry-btn {
          margin-left: auto;
          padding: 0.5rem 1rem;
          background: white;
          border: 2px solid #dc2626;
          border-radius: 6px;
          color: #dc2626;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .retry-btn:hover {
          background: #dc2626;
          color: white;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .progress-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .progress-message {
            text-align: left;
            margin-left: 0;
          }

          .btn-search {
            width: 100%;
          }

          .search-progress {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
