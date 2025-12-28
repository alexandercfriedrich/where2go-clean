# Filter and Footer Issues - Fix Summary

## Overview
This document summarizes the fixes implemented for three issues reported:
1. Category filter reset bug on discovery page
2. Missing footer accordion navigation
3. Static pages not displaying database content

## Issue 1: Category Filter Reset Bug

### Problem
On the discovery page and all pages with filter options, the date filter worked correctly (today, tomorrow, etc.), but when clicking on one of the 12 categories, the correct filter briefly appeared but then jumped back to the unfiltered view after a few milliseconds. The date filter remained correct.

### Root Cause
The issue was in `/app/discover/DiscoveryClient.tsx` at lines 71-76. A `useEffect` hook was synchronizing the `initialCategory` prop with the `selectedCategory` state. When `initialCategory` was undefined (which it was for normal navigation), the effect would reset `selectedCategory` back to `null` whenever the component re-rendered.

```typescript
// BEFORE (Buggy code)
useEffect(() => {
  const nextCategory = initialCategory || null;
  if (nextCategory !== selectedCategory) {
    setSelectedCategory(nextCategory);
  }
}, [initialCategory, selectedCategory]);
```

### Solution
Added a condition to only sync when `initialCategory` is explicitly provided (not undefined):

```typescript
// AFTER (Fixed code)
useEffect(() => {
  if (initialCategory !== undefined) {
    const nextCategory = initialCategory || null;
    if (nextCategory !== selectedCategory) {
      setSelectedCategory(nextCategory);
    }
  }
}, [initialCategory, selectedCategory]);
```

### Files Modified
- `/app/discover/DiscoveryClient.tsx` - Lines 71-78

---

## Issue 2: Footer Accordion Navigation

### Problem
The footer needed an accordion navigation component to better organize city links on mobile devices.

### Solution
Enhanced the `MainFooter.tsx` component to include accordion functionality that:
- On desktop (≥ 768px): Shows all city links expanded (existing behavior)
- On mobile (< 768px): Collapses city links into accordion sections with + / − icons
- Smooth transitions when opening/closing accordions
- Maintains accessibility with proper `aria-expanded` attributes

### Implementation Details

#### State Management
```typescript
const [accordionState, setAccordionState] = useState<AccordionState>({});

const toggleAccordion = (citySlug: string) => {
  setAccordionState(prev => ({
    ...prev,
    [citySlug]: !prev[citySlug]
  }));
};
```

#### Mobile Accordion Structure
```tsx
<button 
  className="city-accordion-header"
  onClick={() => toggleAccordion(city.slug)}
  aria-expanded={accordionState[city.slug]}
>
  <span className="city-name">{city.name}</span>
  <span className="accordion-icon">{accordionState[city.slug] ? '−' : '+'}</span>
</button>
<div className={`city-links-content ${accordionState[city.slug] ? 'open' : ''}`}>
  {/* City links */}
</div>
```

#### CSS Transitions
```css
.city-links-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.3s ease;
  opacity: 0;
}

.city-links-content.open {
  max-height: 200px;
  opacity: 1;
  margin-top: 8px;
}
```

### Files Modified
- `/app/components/MainFooter.tsx` - Complete rewrite with accordion functionality

---

## Issue 3: Static Pages Not Showing Database Content

### Problem
In the `/admin` area, content from the Supabase database was correctly read but not displayed live. The pages (like https://www.where2go.at/kontakt) were showing static content instead of database content. This indicated that static pages still existed instead of dynamic database-driven pages.

### Root Cause
All static pages (impressum, datenschutz, agb, kontakt, ueber-uns, premium) were hardcoded client components with static HTML content. They did not fetch from the database.

### Solution
Created a unified approach for all static pages:

#### 1. Created StaticPageRenderer Component
`/app/components/StaticPageRenderer.tsx` - A reusable component that:
- Fetches content from Supabase via `/api/static-pages/[id]`
- Displays database content when available
- Falls back to provided default content if database content doesn't exist
- Sanitizes HTML content using DOMPurify to prevent XSS attacks
- Applies consistent styling across all static pages

#### 2. Key Features
```typescript
interface StaticPageRendererProps {
  pageId: string;              // Database ID (e.g., 'kontakt', 'impressum')
  fallbackTitle?: string;      // Default title if DB content missing
  fallbackContent?: React.ReactNode;  // Default content if DB content missing
}
```

#### 3. Content Sanitization
```typescript
dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(content || '', {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                   'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'div', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style']
  })
}} 
```

#### 4. Updated All Static Pages
Each page was converted from a hardcoded component to use `StaticPageRenderer`:

```tsx
// BEFORE (kontakt/page.tsx)
export default function Kontakt() {
  return (
    <div className="container">
      {/* Hardcoded HTML content */}
    </div>
  );
}

// AFTER (kontakt/page.tsx)
export default function Kontakt() {
  return (
    <StaticPageRenderer
      pageId="kontakt"
      fallbackTitle="Kontakt"
      fallbackContent={
        <>
          {/* Fallback content as JSX */}
        </>
      }
    />
  );
}
```

### Flow Diagram
```
Admin edits content in /admin/static-pages
        ↓
Content saved to Supabase via POST /api/admin/static-pages
        ↓
User visits /kontakt
        ↓
StaticPageRenderer fetches from GET /api/static-pages/kontakt
        ↓
If found: Display database content (sanitized)
If not found: Display fallback content
```

### Files Created
- `/app/components/StaticPageRenderer.tsx` - New shared component

### Files Modified
- `/app/kontakt/page.tsx` - Converted to use StaticPageRenderer
- `/app/impressum/page.tsx` - Converted to use StaticPageRenderer
- `/app/datenschutz/page.tsx` - Converted to use StaticPageRenderer
- `/app/agb/page.tsx` - Converted to use StaticPageRenderer
- `/app/ueber-uns/page.tsx` - Converted to use StaticPageRenderer
- `/app/premium/page.tsx` - Converted to use StaticPageRenderer

---

## Testing

### Build Test
```bash
npm run build
```
✅ Build completed successfully with no TypeScript errors

### Lint Test
```bash
npm run lint
```
✅ No ESLint warnings or errors

### Manual Testing Required
1. **Category Filter**: 
   - Visit `/discover` page
   - Select a category (e.g., "Musik")
   - Verify the filter persists and doesn't reset
   - Change date filter while category is selected
   - Verify both filters work together

2. **Footer Accordion**:
   - Visit any page on mobile (< 768px width)
   - Check that city sections are collapsed by default
   - Click on a city name to expand/collapse
   - Verify smooth animations and + / − icons
   - On desktop, verify all sections remain expanded

3. **Static Pages**:
   - Visit `/admin/static-pages`
   - Edit content for "Kontakt" page
   - Save changes
   - Visit `/kontakt` in a new tab
   - Verify updated content is displayed
   - Repeat for other pages (impressum, datenschutz, agb, ueber-uns, premium)

---

## Security Considerations

### XSS Prevention
The StaticPageRenderer implements DOMPurify to sanitize all HTML content from the database before rendering. This prevents potential XSS attacks from malicious content stored in the database.

### Allowed HTML Tags
Only safe HTML tags are allowed:
- Text formatting: `p`, `br`, `strong`, `em`, `u`
- Headings: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- Lists: `ul`, `ol`, `li`
- Links: `a` (with href, target, rel attributes)
- Code: `blockquote`, `code`, `pre`
- Structure: `div`, `span` (with class, style attributes)

### Fallback Content
If database content is unavailable or fails to load, the component gracefully falls back to the provided default content, ensuring the site remains functional even if the database is temporarily unavailable.

---

## Deployment Notes

1. No environment variables need to be updated
2. No database migrations required (static_pages table already exists)
3. No breaking changes to existing functionality
4. All changes are backward compatible

---

## Future Improvements

1. **Category Filter**: Consider adding URL parameters for selected category to enable deep linking
2. **Footer Accordion**: Add animation duration configuration option
3. **Static Pages**: 
   - Add version history tracking for content changes
   - Implement content preview before saving
   - Add rich text editor toolbar customization in admin panel
   - Consider adding page-specific metadata (SEO title, description)

---

## Commit History

1. `Fix category filter reset issue` - Fixed useEffect condition in DiscoveryClient.tsx
2. `Update static pages to fetch content from database` - Created StaticPageRenderer and updated all static pages
3. `Add accordion navigation to footer for mobile devices` - Enhanced MainFooter.tsx with accordion functionality
