# Where2Go Event Platform - Schema.org Implementation Instructions

## Project Context
- Next.js 14 App Router with TypeScript
- Event aggregation platform for Vienna and other cities
- Current EventData interface in `app/lib/types.ts` is well-structured
- Event cards rendered in `app/page.tsx` with comprehensive event information

## Development Standards

### Schema.org Requirements
- Implement JSON-LD structured data for all events
- Add microdata attributes to existing HTML elements
- Follow schema.org Event type specification exactly
- Maintain existing EventData interface structure
- Ensure TypeScript type safety for all schema implementations

### Code Style
- Use existing TypeScript interfaces from `app/lib/types.ts`
- Follow current component structure in `app/page.tsx`
- Maintain current CSS class naming conventions
- Preserve existing event rendering logic

### SEO Implementation
- Generate unique canonical URLs for each event
- Implement proper meta tags based on event data
- Add breadcrumb navigation schema
- Ensure rich snippets compatibility

## File References
- EventData interface: `app/lib/types.ts` lines 3-30
- Event rendering: `app/page.tsx` lines 929+ (event card mapping)
- Layout metadata: `app/layout.tsx` lines 9-28
- Schema.org utilities: `app/lib/schemaOrg.ts`

## Implementation Guidelines

### JSON-LD Generation
All JSON-LD schemas must be generated using utility functions in `app/lib/schemaOrg.ts`:
- Use `generateEventSchema()` for individual event schemas
- Use `generateEventListSchema()` for event collection pages
- Use `generateWebSiteSchema()` for site-wide schema in root layout

### Microdata Attributes
When adding microdata to HTML elements:
- Use `itemscope` and `itemtype` attributes for schema definition
- Use `itemprop` for individual properties
- Maintain accessibility and existing functionality
- Ensure attributes are valid HTML5

### Canonical URLs
Event canonical URLs should follow this pattern:
- Format: `{baseUrl}/event/{city}/{date}/{normalized-title}`
- All lowercase, hyphens for spaces
- Remove special characters
- Include city and date for uniqueness

## Testing Requirements
- All schema generation functions must have unit tests
- Validate JSON-LD output against Schema.org specifications
- Test microdata with Google's Rich Results Test
- Ensure TypeScript compilation without errors

## Performance Considerations
- Lazy load schema generation only when needed
- Limit ItemList schemas to 100 items maximum
- Cache generated schemas where appropriate
- Minimize client-side JavaScript for schema rendering
