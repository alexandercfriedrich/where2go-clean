# Filter UI Implementation

This document describes the implementation of user-facing filters and UI polish added to the events page.

## Features Implemented

### 1. Optional Image URLs for Events

**Type Definition** (`app/lib/types.ts`)
```typescript
export interface EventData {
  // ... existing fields
  imageUrl?: string; // Optional image URL for event cards
}
```

**Data Flow:**
- Wien.info API → `wienInfo.ts` normalizer → `route.ts` → Frontend
- Image URLs from Wien.info are automatically included when available
- Other event sources can also provide imageUrl (future enhancement)

### 2. Horizontal Category Multi-Select Filter

**Location:** Above event results grid

**Behavior:**
- Shows all categories present in current result set
- Each chip displays category name + event count
- "Alle" button to toggle all categories on/off
- Click individual chips to toggle selection
- Multiple categories can be selected simultaneously
- Filters applied immediately on selection change

**Styling:**
- Active chips: dark background (#404040)
- Inactive chips: transparent with border
- Count badges with subtle background
- Hover states for better UX

### 3. Left Sidebar Venue Filter

**Location:** Left side of results, sticky positioned

**Behavior:**
- Lists all unique venues from current events
- Sorted by event count (descending)
- "Alle" checkbox to select/deselect all venues
- Individual checkboxes for each venue
- Shows count next to each venue name
- Filters applied immediately on change

**Styling:**
- White background with shadow
- Rounded corners (12px)
- Sticky positioning (stays visible on scroll)
- Max height with scrollbar if needed
- Hidden on mobile (<768px)

**CSS:**
```css
.venue-filter-sidebar {
  min-width: 250px;
  max-width: 300px;
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}
```

### 4. Combined Filter Logic

**Implementation:**
```typescript
const displayedEvents = (() => {
  const dateFiltered = events.filter(matchesSelectedDate);
  if (!searchSubmitted) return dateFiltered;
  
  // Apply category filter
  let filtered = dateFiltered;
  if (selectedCategories.length > 0) {
    filtered = filtered.filter(e => {
      for (const mainCat of selectedCategories) {
        const subs = EVENT_CATEGORY_SUBCATEGORIES[mainCat] || [];
        if (subs.includes(e.category)) return true;
      }
      return false;
    });
  }
  
  // Apply venue filter
  if (selectedVenues.length > 0) {
    filtered = filtered.filter(e => selectedVenues.includes(e.venue));
  }
  
  return filtered;
})();
```

**Filter Initialization:**
- Automatically runs when events are loaded
- Extracts unique categories and venues from current results
- Sets all filters as selected by default
- Updates dynamically when events change

### 5. Date Labels with Today/Tomorrow

**Implementation:**
Uses existing `formatEventDate()` from translation hook:

```typescript
const { t, formatEventDate } = useTranslation();
// ...
<span className="event-date">{formatEventDate(ev.date)}</span>
```

**Translations:**
- German: "heute" / "morgen"
- English: "today" / "tomorrow"
- Other dates: formatted with locale-aware date display

### 6. Event Card Background Images

**Implementation:**
```typescript
<div className="event-card" style={{ position: 'relative', overflow: 'hidden' }}>
  {ev.imageUrl && (
    <div 
      className="event-card-bg-image"
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `url(${ev.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.2,
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  )}
  <div style={{ position: 'relative', zIndex: 1 }}>
    {/* Event content */}
  </div>
</div>
```

**Design Choices:**
- 20% opacity (0.2) = 80% transparency
- Background covers entire card
- Content layered on top with z-index: 1
- No pointer events on background layer
- Graceful fallback when no image available

## Testing

### Automated Tests

**File:** `app/lib/__tests__/imageUrl-support.test.ts`

Tests cover:
1. imageUrl pass-through in normalizeEvents()
2. Missing imageUrl handling
3. imageUrl preservation in validation
4. Whitespace trimming
5. Empty string handling

**Result:** ✅ All 6 tests passing

### Manual Testing Checklist

- [ ] Category filter shows correct counts
- [ ] Category filter selection/deselection works
- [ ] "Alle" button toggles all categories
- [ ] Venue sidebar shows all venues
- [ ] Venue filter selection/deselection works
- [ ] Venue "Alle" checkbox works correctly
- [ ] Both filters work together (AND logic)
- [ ] Filters update when new events load
- [ ] Date labels show "Today"/"Tomorrow" correctly
- [ ] Background images display at correct opacity
- [ ] Cards without images render normally
- [ ] Sidebar is sticky on desktop
- [ ] Sidebar hidden on mobile
- [ ] Wien.info events include images

## Wien.info Integration

To see background images in action:
1. Search for events in Wien (Vienna)
2. Ensure `fetchWienInfo=1` parameter is passed
3. Wien.info events will include imageUrl when available
4. Event cards will show background images automatically

## Responsive Design

**Desktop (>768px):**
- Sidebar visible on left
- Full filter functionality
- Sticky positioning

**Mobile (≤768px):**
- Sidebar hidden (display: none)
- Category filter remains visible
- Results use full width

## Performance Considerations

1. **Filter Initialization:** Only runs when events change
2. **Sticky Sidebar:** Uses CSS `position: sticky` (hardware accelerated)
3. **Image Loading:** Background images loaded lazily by browser
4. **Count Calculations:** Memoized through React's render cycle
5. **Filter Updates:** Immediate, client-side (no API calls)

## Future Enhancements

Potential improvements:
- Image placeholder/loading state
- Image zoom on hover
- Filter state persistence (localStorage)
- URL query parameters for filter state
- Advanced venue search/filter
- Save favorite venues
- Image optimization (next/image)
