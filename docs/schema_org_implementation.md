# Schema.org Implementation

## Overview

Schema.org structured data has been implemented to improve SEO and search engine visibility for the Where2Go event aggregation platform. This implementation follows best practices and Google's structured data guidelines.

## What is Schema.org?

Schema.org is a collaborative initiative to create, maintain, and promote schemas for structured data on the Internet. Search engines like Google, Bing, and Yahoo use this structured data to better understand web page content and provide richer search results.

## Implementation Details

### Components Added

1. **`app/lib/schemaOrg.ts`** - Core utility functions for generating Schema.org structured data
2. **`app/components/SchemaOrg.tsx`** - React component for rendering JSON-LD structured data
3. **`app/lib/__tests__/schemaOrg.test.ts`** - Comprehensive test suite (18 tests)

### Schema Types Implemented

#### 1. WebSite Schema (Root Layout)

Added to `app/layout.tsx` - Provides overall website information:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Where2Go",
  "url": "https://www.where2go.at",
  "description": "Entdecke Events in deiner Stadt - Alle Events. Weltweit. Eine Plattform.",
  "inLanguage": "de",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.where2go.at?city={city}&date={date}"
    },
    "query-input": "required name=city name=date"
  }
}
```

**Benefits:**
- Enables Google's sitelinks search box
- Helps search engines understand the website's primary purpose
- Improves brand visibility in search results

#### 2. Event Schema (Individual Events)

Generated for each event with rich details:

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Concert Title",
  "startDate": "2025-01-20T19:30:00",
  "endDate": "2025-01-20T23:00:00",
  "location": {
    "@type": "Place",
    "name": "Venue Name",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Venue Address"
    }
  },
  "description": "Event description",
  "offers": {
    "@type": "Offer",
    "price": "25",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "url": "https://tickets.example.com"
  },
  "image": "https://example.com/event-image.jpg"
}
```

**Benefits:**
- Events appear in Google's event search
- Rich snippets with date, time, location, and price
- Improved click-through rates from search results

#### 3. ItemList Schema (Event Listings)

Added to `app/page.tsx` - Provides structured list of events:

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Events in Wien am 20.01.2025",
  "description": "Liste von 42 Events in Wien",
  "numberOfItems": 42,
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": { /* Event schema */ }
    }
  ]
}
```

**Benefits:**
- Helps search engines understand the collection of events
- Better indexing of event listings pages
- Potential for carousel display in search results

## Features

### Intelligent Data Extraction

The implementation intelligently extracts and formats data:

- **Date/Time Handling**: Converts "YYYY-MM-DD" and "HH:mm" format to ISO 8601
- **Price Extraction**: Parses text like "Ab 25€" or "25€ - 45€" to numeric values
- **Free Events**: Recognizes "Frei", "Gratis", "Free" and sets price to 0
- **Optional Fields**: Only includes available data (description, image, endTime, etc.)

### Dynamic Rendering

- Schema.org data is only rendered when events are available
- Uses client-side component for dynamic event lists
- Server-side rendering for static WebSite schema

### SEO Optimizations

- **Performance**: Limits ItemList to 100 events to avoid excessive JSON-LD size
- **Validation**: All schemas follow Schema.org specifications
- **Localization**: German language and date formatting

## Testing

Comprehensive test coverage (18 tests) validates:

- ✅ WebSite schema generation with SearchAction
- ✅ Event schema with all required and optional fields
- ✅ Address and location handling
- ✅ Price extraction and formatting
- ✅ ItemList generation with positioned elements
- ✅ Edge cases (free events, missing data, long lists)

Run tests:
```bash
npm test -- schemaOrg.test.ts
```

## Validation

To validate the implementation:

1. **Google Rich Results Test**: https://search.google.com/test/rich-results
   - Test the homepage and event listing pages
   - Verify WebSite and Event schemas are detected

2. **Schema.org Validator**: https://validator.schema.org/
   - Copy the JSON-LD output
   - Verify no errors or warnings

3. **Google Search Console**:
   - Monitor Rich Results reports
   - Check for enhancements and issues

## Usage Examples

### Generating Event Schema

```typescript
import { generateEventSchema } from '@/lib/schemaOrg';

const event: EventData = {
  title: 'Summer Concert',
  category: 'Music',
  date: '2025-06-15',
  time: '19:00',
  endTime: '22:00',
  venue: 'Open Air Arena',
  address: 'Parkstraße 1, 1010 Wien',
  price: 'Ab 35€',
  website: 'https://example.com'
};

const schema = generateEventSchema(event);
```

### Adding Schema to a Page

```tsx
import SchemaOrg from '@/components/SchemaOrg';
import { generateWebSiteSchema } from '@/lib/schemaOrg';

export default function Page() {
  const websiteSchema = generateWebSiteSchema('https://yourdomain.com');
  
  return (
    <div>
      <SchemaOrg schema={websiteSchema} />
      {/* Page content */}
    </div>
  );
}
```

## Benefits

### For Users
- **Better Search Results**: Events appear with rich information in Google
- **Quick Access**: Direct links to tickets and venue information
- **Visual Appeal**: Images and structured data create eye-catching search results

### For the Platform
- **Increased Visibility**: Higher rankings for event-related searches
- **Better CTR**: Rich snippets improve click-through rates
- **Reduced Bounce Rate**: Users find relevant information faster
- **Competitive Advantage**: Professional SEO implementation

### For Search Engines
- **Clear Understanding**: Structured data makes content unambiguous
- **Easy Indexing**: Well-organized information is easier to process
- **Rich Features**: Enables special search result features

## Future Enhancements

Potential improvements for future iterations:

1. **Organization Schema**: Add schema for event organizers
2. **Review Schema**: Include user reviews and ratings when available
3. **Video Schema**: Add video content when events have promotional videos
4. **BreadcrumbList Schema**: Improve navigation understanding
5. **FAQ Schema**: Add frequently asked questions about events
6. **Aggregate Rating**: Include overall ratings when review system is added

## Monitoring

Monitor these metrics to measure success:

1. **Google Search Console**:
   - Rich Results impressions and clicks
   - Errors or warnings for structured data
   - Search queries leading to event pages

2. **Google Analytics**:
   - Organic search traffic trends
   - Click-through rates from search
   - Bounce rates for event pages

3. **Search Engine Rankings**:
   - Position for event-related keywords
   - Visibility in event searches
   - Featured snippet appearances

## Maintenance

The Schema.org implementation requires minimal maintenance:

- **Automatic Updates**: Schema is generated from event data automatically
- **No Manual Editing**: Changes to event fields flow through to schema
- **Test Coverage**: Comprehensive tests ensure reliability
- **Standards Compliance**: Following Schema.org specifications ensures longevity

## Conclusion

The Schema.org implementation significantly enhances the platform's SEO capabilities by providing search engines with structured, machine-readable information about events. This implementation follows industry best practices and is designed to improve search visibility, click-through rates, and overall user experience.

---

**Implementation Date**: 2025-01-20  
**Status**: ✅ Complete and Production-Ready  
**Test Coverage**: 18 tests passing  
**Files Modified**: 3 created, 2 updated  
**Build Status**: ✅ Successful
