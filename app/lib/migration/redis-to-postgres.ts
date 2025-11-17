#!/usr/bin/env ts-node

/**
 * Redis to PostgreSQL Migration Script
 * 
 * Migrates events from Redis cache to PostgreSQL (Supabase).
 * Supports dry-run mode and city filtering.
 * 
 * Usage:
 *   npm run migrate                    # Full migration
 *   npm run migrate:dry-run            # Dry run (no inserts)
 *   ts-node app/lib/migration/redis-to-postgres.ts --city=Wien
 *   ts-node app/lib/migration/redis-to-postgres.ts --dry-run --city=Berlin
 */

import { eventsCache, getRedisClient } from '../cache'
import { EventRepository } from '../repositories/EventRepository'
import type { EventData } from '../types'
import { EVENT_CATEGORIES } from '../eventCategories'

interface MigrationStats {
  totalKeysScanned: number
  totalEventsFound: number
  totalEventsImported: number
  categoriesProcessed: Set<string>
  citiesProcessed: Set<string>
  duplicatesSkipped: number
  errors: string[]
}

interface MigrationOptions {
  dryRun: boolean
  cityFilter?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2)
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    cityFilter: undefined,
    dateFrom: undefined,
    dateTo: undefined
  }

  for (const arg of args) {
    if (arg.startsWith('--city=')) {
      options.cityFilter = arg.split('=')[1]
    }
    if (arg.startsWith('--date-from=')) {
      options.dateFrom = arg.split('=')[1]
    }
    if (arg.startsWith('--date-to=')) {
      options.dateTo = arg.split('=')[1]
    }
  }

  return options
}

/**
 * Generate date range for scanning (default: last 7 days + next 30 days)
 */
function generateDateRange(from?: string, to?: string): string[] {
  const dates: string[] = []
  const startDate = from ? new Date(from) : new Date()
  startDate.setDate(startDate.getDate() - 7) // Include past 7 days

  const endDate = to ? new Date(to) : new Date()
  endDate.setDate(endDate.getDate() + 30) // Include next 30 days

  const current = new Date(startDate)
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Extract city, date, and category from Redis cache key
 * Format: "city_YYYY-MM-DD_category"
 */
function parseRedisKey(key: string): { city: string; date: string; category: string } | null {
  // Remove prefix if present
  const cleanKey = key.replace(/^events:v[0-9]+:/, '')
  
  // Split by underscore
  const parts = cleanKey.split('_')
  if (parts.length < 3) return null

  const date = parts[1]
  const category = parts.slice(2).join('_')
  const city = parts[0]

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  return { city, date, category }
}

/**
 * Scan Redis for event keys matching criteria
 */
async function scanRedisKeys(options: MigrationOptions): Promise<string[]> {
  const redis = getRedisClient()
  const keys: string[] = []
  
  // Use SCAN to iterate through keys (safer for large datasets)
  let cursor: number | string = 0
  
  do {
    try {
      const result: any = await redis.scan(cursor, { match: 'events:v*:*', count: 100 })
      
      // Handle both tuple and object responses
      if (Array.isArray(result) && result.length === 2) {
        cursor = typeof result[0] === 'string' ? parseInt(result[0], 10) : result[0]
        const foundKeys = result[1] || []
        
        for (const key of foundKeys) {
          const parsed = parseRedisKey(key)
          if (!parsed) continue

          // Apply city filter if specified
          if (options.cityFilter && parsed.city.toLowerCase() !== options.cityFilter.toLowerCase()) {
            continue
          }

          // Apply date filters if specified
          if (options.dateFrom && parsed.date < options.dateFrom) continue
          if (options.dateTo && parsed.date > options.dateTo) continue

          keys.push(key)
        }
      } else {
        break
      }
    } catch (error) {
      console.error('[Migration] Error scanning Redis keys:', error)
      break
    }
  } while (cursor !== 0)

  return keys
}

/**
 * Main migration function
 */
async function migrate(options: MigrationOptions): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalKeysScanned: 0,
    totalEventsFound: 0,
    totalEventsImported: 0,
    categoriesProcessed: new Set(),
    citiesProcessed: new Set(),
    duplicatesSkipped: 0,
    errors: []
  }

  console.log('🚀 Starting Redis → PostgreSQL migration...')
  console.log('Options:', options)
  console.log('')

  // 1. Scan Redis for matching keys
  console.log('📋 Scanning Redis keys...')
  const keys = await scanRedisKeys(options)
  stats.totalKeysScanned = keys.length
  console.log(`Found ${keys.length} cache keys matching criteria`)
  console.log('')

  if (keys.length === 0) {
    console.log('⚠️  No keys found. Nothing to migrate.')
    return stats
  }

  // 2. Process each key
  for (const key of keys) {
    const parsed = parseRedisKey(key)
    if (!parsed) continue

    const { city, date, category } = parsed
    stats.categoriesProcessed.add(category)
    stats.citiesProcessed.add(city)

    try {
      // Fetch events from Redis
      const events = await eventsCache.get<EventData[]>(key)
      
      if (!events || !Array.isArray(events) || events.length === 0) {
        continue
      }

      stats.totalEventsFound += events.length
      console.log(`📦 ${city} | ${date} | ${category}: ${events.length} events`)

      if (options.dryRun) {
        console.log('   [DRY RUN] Would import these events')
        continue
      }

      // 3. Import to PostgreSQL
      const result = await EventRepository.bulkInsertEvents(events, city)
      
      if (result.success) {
        stats.totalEventsImported += result.inserted
        console.log(`   ✅ Imported ${result.inserted} events`)
      } else {
        const errorMsg = `Failed to import ${city}/${date}/${category}: ${result.errors.join(', ')}`
        stats.errors.push(errorMsg)
        console.error(`   ❌ ${errorMsg}`)
      }
    } catch (error) {
      const errorMsg = `Exception processing ${key}: ${error}`
      stats.errors.push(errorMsg)
      console.error(`   ❌ ${errorMsg}`)
    }
  }

  return stats
}

/**
 * Print final statistics
 */
function printStats(stats: MigrationStats, options: MigrationOptions): void {
  console.log('')
  console.log('═══════════════════════════════════════════════')
  console.log('📊 Migration Statistics')
  console.log('═══════════════════════════════════════════════')
  
  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No data was written')
  }
  
  console.log(`Keys scanned:       ${stats.totalKeysScanned}`)
  console.log(`Events found:       ${stats.totalEventsFound}`)
  console.log(`Events imported:    ${stats.totalEventsImported}`)
  console.log(`Cities processed:   ${Array.from(stats.citiesProcessed).join(', ')}`)
  console.log(`Categories:         ${stats.categoriesProcessed.size}`)
  console.log(`Errors:             ${stats.errors.length}`)
  
  if (stats.errors.length > 0) {
    console.log('')
    console.log('Errors:')
    stats.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`))
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`)
    }
  }
  
  console.log('═══════════════════════════════════════════════')
}

/**
 * Entry point
 */
async function main() {
  const options = parseArgs()
  
  console.log('╔═══════════════════════════════════════════════╗')
  console.log('║   Redis → PostgreSQL Migration Tool          ║')
  console.log('╚═══════════════════════════════════════════════╝')
  console.log('')

  try {
    const stats = await migrate(options)
    printStats(stats, options)
    
    if (stats.errors.length > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { migrate }
export type { MigrationOptions, MigrationStats }
