# Deprecations

## Removed: `/api/events/progressive-search` (Streaming Endpoint)

**Date of Removal:** December 2024  
**Status:** Active  

### Reason for Removal

The Server-Sent Events (SSE) endpoint for per-category streaming was not used by the frontend (no EventSource/fetch streaming integration present). Maintaining unused code increased complexity and risk of confusion.

### Impact of Removal

- **No functional change** for end users (polling-based progressive updates remain active)
- All current progressive behavior relies on the job store updates exposed through the standard search pathway
- Reduced codebase complexity and maintenance overhead

### Current Progressive Update Implementation

The application currently uses a **polling + job store mechanism** for progressive updates:

1. After each category is processed, aggregated events are written to the job store
2. The frontend polls and merges new events, marking fresh ones with a "Neu" badge  
3. Toast notifications show category progress and newly added event counts
4. Debug mode surfaces raw API response summaries, parsing metrics, and phase statistics

### Reintroduction Path

If streaming (SSE or WebSockets) is needed in the future:

1. Add an SSE or WebSocket layer inside `app/api/events/search/route.ts` gated by `options.progressive === true`
2. Stream per-category chunks with a schema similar to the removed implementation (`type: 'progress' | 'complete'`)
3. Provide a client integration (EventSource or WebSocket) with merge + dedup logic
4. Consider cancellation support and bi-directional control for enhanced UX

### Historical Reference

The removed code can be retrieved from Git history prior to the commit introducing this deprecation note.