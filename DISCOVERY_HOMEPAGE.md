# Discovery Homepage

## Overview

The Discovery Homepage is a modern, dark-mode-first event discovery experience designed to help users find personalized events in Vienna and other cities. It features:

- **Dark Mode First Design**: Beautiful gradients and thoughtfully designed color system
- **Personalization Engine**: Score events based on location, time, category affinity, and user preferences
- **Smart Event Sections**: Trending, For You, Weekend, and Category-based discovery
- **Responsive Design**: Mobile-first with seamless desktop experience
- **Performance Optimized**: Server-side rendering with Supabase integration

## Architecture

### Design System

**Location**: `lib/design-tokens.ts`

Comprehensive design tokens including:
- Color palettes (dark & light themes)
- Typography scales
- Spacing system
- Shadows and elevations
- Border radius values
- Breakpoints
- Z-index layers
- Transitions and easings

### Theme System

**Location**: `app/components/ui/ThemeProvider.tsx`

Features:
- System preference detection
- LocalStorage persistence
- No-flash hydration strategy
- `useTheme()` hook for components

### Feature Flags

**Location**: `lib/feature-flags.ts`

- URL query parameter override (`?discovery=true`)
- A/B testing with deterministic user assignment
- LocalStorage persistence for consistency

### Event Queries

**Location**: `lib/events/queries.ts`

Supabase queries for:
- `getTrendingEvents()` - High popularity/view count
- `getWeekendEvents()` - Friday 00:00 to Monday 04:00
- `getNearbyEvents()` - Location-based with distance calculation
- `getPersonalizedEvents()` - Candidate events for scoring
- `getEventsByCategory()` - Category-filtered events

### Personalization Engine

**Location**: `lib/personalization/recommendations.ts`

**Scoring Algorithm**:
```typescript
Total Score = 
  (Location Score × 0.25) +
  (Time Score × 0.15) +
  (Category Score × 0.20) +
  (Popularity Score × 0.20) +
  (Price Score × 0.10) +
  (Trending Score × 0.10)
```

**Components**:
- **Location Score (0-100)**: Distance-based, closer events score higher
- **Time Score (0-100)**: Relevance based on event timing (today > this week > this month)
- **Category Score (0-100)**: User's category affinity preferences
- **Popularity Score (0-100)**: View count, featured status, popularity metrics
- **Price Score (0-100)**: Matches user price preferences (free/budget/premium)
- **Trending Score (0-100)**: Recent view spikes and engagement

### Geolocation Utilities

**Location**: `lib/geo/distance.ts`

- Haversine formula for accurate distance calculation
- Browser geolocation API integration
- City coordinate fallbacks
- Distance formatting (meters/kilometers)

## Components

### Navigation

**DiscoveryNav** (`app/components/discovery/DiscoveryNav.tsx`)
- Sticky top navigation (72px height)
- Logo, navigation links
- Theme toggle button
- Sign In/Profile placeholder

**LocationBar** (`app/components/discovery/LocationBar.tsx`)
- Sticky bar below nav (48px height)
- Location selector with city switching
- Quick date filter pills (Today, This Week, Weekend, Next Week)
- Filters button

### Event Display

**Badge** (`app/components/discovery/Badge.tsx`)
- Variant support (default, primary, success, warning, error)
- Size options (sm, md, lg)
- Dark mode compatible

**SectionHeader** (`app/components/discovery/SectionHeader.tsx`)
- Title and subtitle
- Optional "See all" action link
- Consistent spacing

**CategoryBrowser** (`app/components/discovery/CategoryBrowser.tsx`)
- Visual category grid with icons and colors
- Count badges
- CategoryPill compact variant
- Selection state support

### Discovery Page

**Server Component**: `app/discover/page.tsx`
- Server-side data fetching (SSR)
- Parallel queries for trending, weekend, personalized events
- Metadata configuration

**Client Component**: `app/discover/DiscoveryClient.tsx`
- Interactive state management
- Theme provider integration
- Event card rendering
- Section layout

## Routing

### Main Route
- `/discover` - Discovery homepage with personalized event feed

### Planned Routes
- `/discover/for-you` - Full personalized feed
- `/discover/trending` - All trending events
- `/discover/weekend` - Weekend event planner
- `/discover/nearby` - Location-based events with map
- `/discover/category/[id]` - Category-specific events

## Styling

### Tailwind Configuration

**tailwind.config.js**:
- Dark mode class strategy
- Extended color palette (primary colors)
- Custom breakpoints
- Aspect ratio utilities
- Z-index utilities

### Dark Mode Implementation

Classes are applied via `data-theme` attribute and Tailwind's `dark:` prefix:
```html
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-gray-100">Content</p>
</div>
```

## Data Flow

1. **Server Component** (`page.tsx`) fetches initial data from Supabase
2. **Client Component** (`DiscoveryClient.tsx`) receives initial data as props
3. **ThemeProvider** wraps the entire app for dark mode support
4. **Event Cards** render with category colors and dynamic styling
5. **Interactive elements** update state and trigger refetches

## Performance Optimizations

- **Server-Side Rendering**: Initial data fetched on the server
- **Static Generation**: Discovery page pre-rendered at build time
- **Parallel Queries**: Trending, weekend, and personalized events fetched simultaneously
- **Image Optimization**: Next.js Image component ready (to be added)
- **Code Splitting**: React components lazy-loaded
- **Tailwind CSS**: Purged and minified in production

## Future Enhancements

### Map Integration (Planned)
- **DarkMap Component**: Mapbox GL with dark-v11 style
- Custom markers with category colors
- Event popups with details
- Nearby events tab with map/list toggle

### Enhanced Personalization
- User profile persistence
- Event interaction tracking
- Category affinity learning
- Collaborative filtering

### A/B Testing
- Feature flag integration complete
- Metrics collection (to be added)
- Variant analytics (to be added)

### Mobile Optimizations
- Bottom navigation bar
- Swipe gestures for sections
- Pull-to-refresh
- Infinite scroll

## Testing

### Unit Tests (Planned)
- Personalization scoring algorithms
- Distance calculations
- Category utilities
- Feature flag logic

### Integration Tests (Planned)
- Component rendering
- Theme switching
- Data fetching
- User interactions

## Development

### Running Locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/discover`

### Environment Variables

```env
# Supabase (required for event data)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Mapbox (optional, for map features)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# Feature Flags (optional)
NEXT_PUBLIC_FEATURE_DISCOVERY_HOMEPAGE=true
```

### Building for Production

```bash
npm run build
npm start
```

## Deployment

The discovery homepage is compatible with:
- Vercel (recommended)
- Netlify
- Any Node.js hosting platform

Static routes are pre-rendered at build time for optimal performance.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus management
- Screen reader compatible
- Color contrast compliance (WCAG AA)

## License

This is part of the Where2Go event platform.
