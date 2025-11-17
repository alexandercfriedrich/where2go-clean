/**
 * Monitoring utility for tracking query performance and metrics
 * 
 * Usage:
 *   import { EventMetrics } from '@/lib/monitoring'
 *   EventMetrics.logQuery('postgresql', 45, 25)
 *   const stats = await EventMetrics.getStats()
 */

import { supabase } from './supabase/client'

interface QueryLog {
  type: 'postgresql' | 'redis' | 'hybrid'
  durationMs: number
  resultCount: number
  timestamp: number
}

/**
 * In-memory metrics store (can be replaced with Redis/PostgreSQL later)
 * For Phase 1, we keep it simple with in-memory storage
 */
class MetricsStore {
  private logs: QueryLog[] = []
  private maxLogs = 1000 // Keep last 1000 queries

  add(log: QueryLog): void {
    this.logs.push(log)
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  getRecent(count: number): QueryLog[] {
    return this.logs.slice(-count)
  }

  getAll(): QueryLog[] {
    return [...this.logs]
  }

  clear(): void {
    this.logs = []
  }

  getStats(): {
    total: number
    byType: Record<string, number>
    avgDuration: number
    avgResultCount: number
  } {
    const byType: Record<string, number> = {
      postgresql: 0,
      redis: 0,
      hybrid: 0
    }

    let totalDuration = 0
    let totalResults = 0

    for (const log of this.logs) {
      byType[log.type]++
      totalDuration += log.durationMs
      totalResults += log.resultCount
    }

    return {
      total: this.logs.length,
      byType,
      avgDuration: this.logs.length > 0 ? totalDuration / this.logs.length : 0,
      avgResultCount: this.logs.length > 0 ? totalResults / this.logs.length : 0
    }
  }
}

const metricsStore = new MetricsStore()

/**
 * EventMetrics provides simple performance tracking for queries
 */
export class EventMetrics {
  /**
   * Log a query execution
   */
  static logQuery(
    type: 'postgresql' | 'redis' | 'hybrid',
    durationMs: number,
    resultCount: number
  ): void {
    metricsStore.add({
      type,
      durationMs,
      resultCount,
      timestamp: Date.now()
    })
  }

  /**
   * Get aggregated statistics
   */
  static getStats(): {
    total: number
    byType: Record<string, number>
    avgDuration: number
    avgResultCount: number
  } {
    return metricsStore.getStats()
  }

  /**
   * Get recent query logs
   */
  static getRecentLogs(count: number = 100): QueryLog[] {
    return metricsStore.getRecent(count)
  }

  /**
   * Clear all metrics (useful for testing)
   */
  static clearMetrics(): void {
    metricsStore.clear()
  }

  /**
   * Get database statistics from PostgreSQL
   * TODO: Implement once we have more data
   */
  static async getDatabaseStats(): Promise<{
    totalEvents: number
    totalVenues: number
    eventsByCity: Record<string, number>
    eventsByCategory: Record<string, number>
  }> {
    try {
      // Get total events count
      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })

      // Get total venues count
      const { count: totalVenues } = await supabase
        .from('venues')
        .select('*', { count: 'exact', head: true })

      // Get events by city
      const { data: cityData } = await supabase
        .from('events')
        .select('city')

      const eventsByCity: Record<string, number> = {}
      for (const row of cityData || []) {
        eventsByCity[row.city] = (eventsByCity[row.city] || 0) + 1
      }

      // Get events by category
      const { data: categoryData } = await supabase
        .from('events')
        .select('category')

      const eventsByCategory: Record<string, number> = {}
      for (const row of categoryData || []) {
        eventsByCategory[row.category] = (eventsByCategory[row.category] || 0) + 1
      }

      return {
        totalEvents: totalEvents || 0,
        totalVenues: totalVenues || 0,
        eventsByCity,
        eventsByCategory
      }
    } catch (error) {
      console.error('[EventMetrics] Failed to get database stats:', error)
      return {
        totalEvents: 0,
        totalVenues: 0,
        eventsByCity: {},
        eventsByCategory: {}
      }
    }
  }

  /**
   * Log formatted stats to console
   */
  static logStats(): void {
    const stats = this.getStats()
    console.log('═══════════════════════════════════════════════')
    console.log('📊 Event Query Metrics')
    console.log('═══════════════════════════════════════════════')
    console.log(`Total queries: ${stats.total}`)
    console.log(`PostgreSQL: ${stats.byType.postgresql}`)
    console.log(`Redis: ${stats.byType.redis}`)
    console.log(`Hybrid: ${stats.byType.hybrid}`)
    console.log(`Avg duration: ${Math.round(stats.avgDuration * 100) / 100}ms`)
    console.log(`Avg result count: ${Math.round(stats.avgResultCount * 100) / 100}`)
    console.log('═══════════════════════════════════════════════')
  }
}

// TODO Phase 2: Add pgvector performance monitoring
// TODO Phase 2: Add scraper job monitoring
// TODO Phase 2: Add cron job execution tracking
