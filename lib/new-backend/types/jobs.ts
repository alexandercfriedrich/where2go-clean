/**
 * Core job & progress domain types (unified, refactored).
 */

import { EventData } from './events';

/**
 * High-level lifecycle states for an event search job.
 *
 * EMPTY: All categories processed (no failures) but zero events found.
 */
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  PARTIAL_SUCCESS = 'partial_success',
  EMPTY = 'empty',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Per-category fine-grained processing states.
 */
export enum ProgressState {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRIED = 'retried'
}

export interface CategoryState {
  state: ProgressState;
  retryCount: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  eventCount?: number;
}

export interface JobProgress {
  totalCategories: number;
  completedCategories: number;
  failedCategories: number;
  categoryStates: Record<string, CategoryState>;
}

export interface EventSearchJob {
  id: string;
  signature: string;
  status: JobStatus;
  city: string;
  date: string;
  categories: string[];
  events: EventData[];
  progress: JobProgress;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  ttlSeconds: number;
}

export interface CreateJobParams {
  city: string;
  date: string;
  categories: string[];
  ttlSeconds?: number;
}

export interface CreateJobResult {
  job: EventSearchJob;
  isNew: boolean;
  isStale?: boolean;
}