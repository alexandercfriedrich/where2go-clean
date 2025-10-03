# Auto Today Dashboard

## Overview

The Where2Go application automatically defaults to showing events for "today" when users first load the dashboard. This provides an immediate, relevant experience without requiring users to manually select a date.

## Implementation

### Default Time Period State

The time period is initialized to "heute" (today) in the main page component:

```tsx
const [timePeriod, setTimePeriod] = useState('heute');
```

Located in: `app/page.tsx` (line 35)

### Time Period Options

The application provides four time period options in the UI:
1. **Heute** (Today) - Default selection
2. **Morgen** (Tomorrow)
3. **Kommendes Wochenende** (Coming Weekend)
4. **Benutzerdefiniert** (Custom) - Opens a calendar picker

### Date Formatting and Comparison

The application uses ISO date format (YYYY-MM-DD) internally for consistency and reliable date comparisons:

```tsx
function todayISO() { 
  return toISODate(new Date()); 
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

### API Date Selection

When making API calls, the `formatDateForAPI()` function determines which date to send:

```tsx
function formatDateForAPI(): string {
  if (timePeriod === 'heute') return todayISO();
  if (timePeriod === 'morgen') return tomorrowISO();
  if (timePeriod === 'kommendes-wochenende') return nextWeekendDatesISO()[0];
  return customDate || todayISO();
}
```

Note: If no custom date is set, it defaults to `todayISO()` as a fallback.

### Event Filtering

Events are filtered on the client side to match the selected date:

```tsx
function matchesSelectedDate(ev: EventData): boolean {
  const evDate = ev.date?.slice(0,10);
  if (!evDate) return true;
  if (timePeriod === 'heute') return evDate === todayISO();
  if (timePeriod === 'morgen') return evDate === tomorrowISO();
  if (timePeriod === 'kommendes-wochenende') {
    const wk = nextWeekendDatesISO();
    return wk.includes(evDate);
  }
  if (customDate) return evDate === customDate;
  return true;
}
```

## User Experience

### Benefits
- **Immediate Relevance**: Users see events happening today without any configuration
- **Natural Default**: "Today" is the most common search query for event discovery
- **Progressive Enhancement**: Users can easily switch to other time periods if needed
- **Zero Configuration**: Works out of the box for new visitors

### Date Picker Integration
When users select "Benutzerdefiniert" (Custom), a calendar dropdown appears:
- Minimum selectable date is today (prevents selecting past dates)
- Two-month view for easy date selection
- Closes on selection or when clicking outside
- ESC key closes the dropdown

## Technical Details

### State Management
- `timePeriod`: Controls which time period option is selected
- `customDate`: Stores the user's custom date selection in ISO format
- `showDateDropdown`: Controls visibility of the calendar picker

### Date Utilities
All date manipulation functions are pure and deterministic:
- `todayISO()`: Returns today's date in ISO format
- `tomorrowISO()`: Returns tomorrow's date in ISO format
- `nextWeekendDatesISO()`: Returns array of [Friday, Saturday, Sunday] dates for the coming weekend

### Timezone Handling
All dates are processed in the user's local timezone using JavaScript's native `Date` object. This ensures that "today" matches the user's local time, not server time.

## Related Files
- `app/page.tsx`: Main implementation
- `app/lib/eventCategories.ts`: Event category definitions
- `app/lib/polling.ts`: Job polling and event fetching logic
