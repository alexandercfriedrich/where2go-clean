# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **BREAKING**: Migrated from legacy `app/lib/perplexity.ts` to new `lib/new-backend/services/perplexityClient.ts`
  - Removed `PerplexityService` class and `createPerplexityService()` function
  - All Perplexity AI usage now consolidated on the new `PerplexityClient` with `getPerplexityClient()`
  - Maintained backward compatibility through `queryGeneral()` and `queryMultipleCategories()` methods
  - Improved HTTP implementation with proper timeouts, retries, and structured error handling
  - Enhanced debug logging with `[PerplexityClient-NEW]` prefix for verification

### Removed
- Legacy `app/lib/perplexity.ts` file and its exports
- `PerplexityService` class
- `createPerplexityService()` function

### Added
- Real HTTP request implementation in `PerplexityClient` (replaced stub)
- Exponential backoff with jitter in retry logic
- Configurable batch processing with `batchSize` and `delayBetweenBatches`
- AbortController-based timeout handling
- Structured error handling using `ErrorCode.AI_SERVICE_ERROR`
- Backward compatibility methods:
  - `queryGeneral(city, date)` - equivalent to `executeSingleQuery()`
  - `queryMultipleCategories(city, date, categories)` - equivalent to `executeMultiQuery()`

### Migration Guide
If you were using the legacy Perplexity service:

**Before:**
```typescript
import { createPerplexityService } from '@/lib/perplexity';

const service = createPerplexityService(apiKey);
const results = await service.executeMultiQuery(city, date, categories);
const singleResult = await service.executeSingleQuery(city, date);
```

**After:**
```typescript
import { getPerplexityClient } from '@/lib/new-backend/services/perplexityClient';

const client = getPerplexityClient({ apiKey });
const results = await client.queryMultipleCategories(city, date, categories);
const singleResult = await client.queryGeneral(city, date);
```

The return types and behavior remain identical for seamless migration.