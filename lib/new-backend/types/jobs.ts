/**
 * Job-related domain types for the new asynchronous backend system.
 * This module defines job lifecycle, states, and progress tracking.
 * 
 * @fileoverview Job domain models with explicit TypeScript types and JSDoc documentation.
 */

import { EventData } from './events';

/**
 * Job status enum representing the lifecycle of an event search job.
 */
export enum JobStatus {
  /** Job created but not yet started */
  PENDING = 'pending',
  
  /** Job currently being processed */
  RUNNING = 'running',
  
  /** Job completed successfully - all categories processed */
  SUCCESS = 'success',
  
  /** Job completed with some categories successful, others failed */
  PARTIAL_SUCCESS = 'partial_success',
  
  /** Job failed completely - no categories processed successfully */
  FAILED = 'failed',
  
  /** Job was cancelled before completion */
  CANCELLED = 'cancelled'
}

/**
 * Progress tracking enum for job processing states.
 */
export enum ProgressState {
  /** Category processing not started */
  NOT_STARTED = 'not_started',
  
  /** Category currently being processed */
  IN_PROGRESS = 'in_progress',
  
  /** Category processed successfully */
  COMPLETED = 'completed',
  
  /** Category processing failed */
  FAILED = 'failed',
  
  /** Category processing was retried */
  RETRIED = 'retried'
}

/**
 * State tracking for individual category processing.
 */
export interface CategoryState {
  /** Current processing state */
  state: ProgressState;
  
  /** Number of retry attempts */
  retryCount: number;
  
  /** Error message if processing failed */
  error?: string;
  
  /** When processing started (ISO timestamp) */
  startedAt?: string;
  
  /** When processing completed/failed (ISO timestamp) */
  completedAt?: string;
  
  /** Number of events found for this category */
  eventCount?: number;
}

/**
 * Overall job progress tracking.
 */
export interface JobProgress {
  /** Total number of categories to process */
  totalCategories: number;
  
  /** Number of categories completed successfully */
  completedCategories: number;
  
  /** Number of categories that failed */
  failedCategories: number;
  
  /** Detailed state for each category */
  categoryStates: Record<string, CategoryState>;
}

/**
 * Core job data structure representing an event search job.
 */
export interface EventSearchJob {
  /** Unique job identifier */
  id: string;
  
  /** Job signature for deduplication (hash of city|date|categories) */
  signature: string;
  
  /** Current job status */
  status: JobStatus;
  
  /** Search parameters */
  city: string;
  date: string;
  categories: string[];
  
  /** Aggregated events from all processed categories */
  events: EventData[];
  
  /** Progress tracking */
  progress: JobProgress;
  
  /** When the job was created (ISO timestamp) */
  createdAt: string;
  
  /** When the job was last updated (ISO timestamp) */
  updatedAt: string;
  
  /** When the job started processing (ISO timestamp) */
  startedAt?: string;
  
  /** When the job completed/failed (ISO timestamp) */
  completedAt?: string;
  
  /** Error message if job failed */
  error?: string;
  
  /** TTL for job cleanup (seconds) */
  ttlSeconds: number;
}

/**
 * Job creation parameters.
 */
export interface CreateJobParams {
  /** Target city */
  city: string;
  
  /** Event date in YYYY-MM-DD format */
  date: string;
  
  /** Categories to search (will be normalized) */
  categories: string[];
  
  /** Optional TTL override (default: 3600 seconds) */
  ttlSeconds?: number;
}

/**
 * Job creation result.
 */
export interface CreateJobResult {
  /** The created or existing job */
  job: EventSearchJob;
  
  /** Whether this was a newly created job or reused existing */
  isNew: boolean;
  
  /** If reused, indicates if the existing job is still valid/fresh */
  isStale?: boolean;
}