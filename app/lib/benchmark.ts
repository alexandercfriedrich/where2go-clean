/**
 * Benchmark utility for comparing PostgreSQL vs Redis query performance
 * 
 * Usage:
 *   import { benchmarkQueries } from '@/lib/benchmark'
 *   const results = await benchmarkQueries()
 */

import { EventRepository } from './repositories/EventRepository'
import { eventsCache } from './cache'
import type { EventData } from './types'

export interface BenchmarkResult {
  testName: string
  postgresqlMs: number
  redisMs: number
  winner: 'postgresql' | 'redis' | 'tie'
  speedupFactor: number
  postgresqlCount: number
  redisCount: number
}

export interface BenchmarkSummary {
  timestamp: string
  totalTests: number
  results: BenchmarkResult[]
  avgPostgresqlMs: number
  avgRedisMs: number
  overallWinner: 'postgresql' | 'redis' | 'tie'
}

/**
 * Measure execution time of an async function
 */
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  return { result, timeMs: end - start }
}

/**
 * Benchmark: Get events by city and date
 */
async function benchmarkGetEventsByCityDate(
  city: string,
  date: string,
  category: string
): Promise<BenchmarkResult> {
  // PostgreSQL query
  const pgBench = await measureTime(async () => {
    return await EventRepository.getEvents({ city, date, category, limit: 100 })
  })

  // Redis query
  const cacheKey = `${city.toLowerCase()}_${date}_${category}`
  const redisBench = await measureTime(async () => {
    return await eventsCache.get<EventData[]>(cacheKey) || []
  })

  const speedup = redisBench.timeMs > 0 ? pgBench.timeMs / redisBench.timeMs : 1
  let winner: 'postgresql' | 'redis' | 'tie' = 'tie'
  
  if (pgBench.timeMs < redisBench.timeMs * 0.9) {
    winner = 'postgresql'
  } else if (redisBench.timeMs < pgBench.timeMs * 0.9) {
    winner = 'redis'
  }

  return {
    testName: `Get events: ${city}/${date}/${category}`,
    postgresqlMs: Math.round(pgBench.timeMs * 100) / 100,
    redisMs: Math.round(redisBench.timeMs * 100) / 100,
    winner,
    speedupFactor: Math.round(speedup * 100) / 100,
    postgresqlCount: pgBench.result.length,
    redisCount: Array.isArray(redisBench.result) ? redisBench.result.length : 0
  }
}

/**
 * Benchmark: Search events
 */
async function benchmarkSearchEvents(
  city: string,
  searchTerm: string
): Promise<BenchmarkResult> {
  // PostgreSQL full-text search
  const pgBench = await measureTime(async () => {
    return await EventRepository.searchEvents({ city, searchTerm, limit: 50 })
  })

  // Redis doesn't support full-text search, so we'll mark it as N/A
  return {
    testName: `Search events: "${searchTerm}" in ${city}`,
    postgresqlMs: Math.round(pgBench.timeMs * 100) / 100,
    redisMs: 0,
    winner: 'postgresql',
    speedupFactor: 0,
    postgresqlCount: pgBench.result.length,
    redisCount: 0
  }
}

/**
 * Run comprehensive benchmark suite
 */
export async function benchmarkQueries(options?: {
  cities?: string[]
  dates?: string[]
  categories?: string[]
  searchTerms?: string[]
}): Promise<BenchmarkSummary> {
  const {
    cities = ['Wien'],
    dates = [new Date().toISOString().split('T')[0]],
    categories = ['Musik & Nachtleben', 'Kunst & Kultur'],
    searchTerms = ['concert', 'jazz']
  } = options || {}

  const results: BenchmarkResult[] = []

  console.log('🏁 Starting benchmark suite...')
  console.log('')

  // Test 1: Get events by city/date/category
  for (const city of cities) {
    for (const date of dates) {
      for (const category of categories) {
        console.log(`Testing: ${city}/${date}/${category}`)
        const result = await benchmarkGetEventsByCityDate(city, date, category)
        results.push(result)
        console.log(`  PostgreSQL: ${result.postgresqlMs}ms (${result.postgresqlCount} events)`)
        console.log(`  Redis: ${result.redisMs}ms (${result.redisCount} events)`)
        console.log(`  Winner: ${result.winner}`)
        console.log('')
      }
    }
  }

  // Test 2: Search events
  for (const city of cities) {
    for (const term of searchTerms) {
      console.log(`Testing: Search "${term}" in ${city}`)
      const result = await benchmarkSearchEvents(city, term)
      results.push(result)
      console.log(`  PostgreSQL: ${result.postgresqlMs}ms (${result.postgresqlCount} events)`)
      console.log(`  Winner: ${result.winner} (Redis doesn't support search)`)
      console.log('')
    }
  }

  // Calculate summary statistics
  const pgTimes = results.map(r => r.postgresqlMs)
  const redisTimes = results.filter(r => r.redisMs > 0).map(r => r.redisMs)
  
  const avgPostgresqlMs = pgTimes.reduce((a, b) => a + b, 0) / pgTimes.length
  const avgRedisMs = redisTimes.length > 0 
    ? redisTimes.reduce((a, b) => a + b, 0) / redisTimes.length 
    : 0

  let overallWinner: 'postgresql' | 'redis' | 'tie' = 'tie'
  if (avgPostgresqlMs < avgRedisMs * 0.9) {
    overallWinner = 'postgresql'
  } else if (avgRedisMs > 0 && avgRedisMs < avgPostgresqlMs * 0.9) {
    overallWinner = 'redis'
  }

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    results,
    avgPostgresqlMs: Math.round(avgPostgresqlMs * 100) / 100,
    avgRedisMs: Math.round(avgRedisMs * 100) / 100,
    overallWinner
  }
}

/**
 * Log benchmark results to console in a formatted way
 */
export function logBenchmarkResults(summary: BenchmarkSummary): void {
  console.log('')
  console.log('═══════════════════════════════════════════════')
  console.log('📊 Benchmark Results Summary')
  console.log('═══════════════════════════════════════════════')
  console.log(`Timestamp: ${summary.timestamp}`)
  console.log(`Total tests: ${summary.totalTests}`)
  console.log(`Avg PostgreSQL: ${summary.avgPostgresqlMs}ms`)
  console.log(`Avg Redis: ${summary.avgRedisMs}ms`)
  console.log(`Overall winner: ${summary.overallWinner}`)
  console.log('═══════════════════════════════════════════════')
  console.log('')
  
  console.log('Detailed Results:')
  for (const result of summary.results) {
    console.log(`  ${result.testName}`)
    console.log(`    PostgreSQL: ${result.postgresqlMs}ms (${result.postgresqlCount} items)`)
    console.log(`    Redis: ${result.redisMs}ms (${result.redisCount} items)`)
    console.log(`    Winner: ${result.winner}`)
  }
}
