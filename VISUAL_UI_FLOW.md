# Visual UI Flow - Optimized Search Feature

## Main Search Form

```
┌─────────────────────────────────────────────────────────────┐
│                     Where2Go Event Search                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Stadt/City                                                  │
│  ┌──────────────────────────────────┐                       │
│  │ Wien                          ▼  │                       │
│  └──────────────────────────────────┘                       │
│                                                              │
│  Zeitraum/Date                                              │
│  ┌──────────────────────────────────┐                       │
│  │ Heute                         ▼  │                       │
│  └──────────────────────────────────┘                       │
│                                                              │
│  Kategorien/Categories                                      │
│  ☑ DJ Sets/Electronic    ☑ Live-Konzerte                   │
│  ☐ Clubs/Discos          ☐ Theater/Performance             │
│  ☑ Open Air              ☐ Museen                           │
│                                                              │
│  ┌──────────────────────────────────┐                       │
│  │      📅 Events suchen            │                       │
│  └──────────────────────────────────┘                       │
│                                                              │
│  ┌─────────────────────────────────────────────┐            │
│  │ ☐ Use optimized search (max 5 AI calls) 🚀 │            │
│  └─────────────────────────────────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## During Optimized Search - Phase 1

```
┌─────────────────────────────────────────────────────────────┐
│                   🔍 Optimized Search                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Progress                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │████████████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│  └────────────────────────────────────────────────────────┘ │
│  25%                                                         │
│                                                              │
│  Phase 1 of 4                                               │
│  📦 Checking cache and local APIs...                        │
│                                                              │
│  ✅ 42 events found                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## During Optimized Search - Phase 3

```
┌─────────────────────────────────────────────────────────────┐
│                   🔍 Optimized Search                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Progress                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │████████████████████████████████████████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│  └────────────────────────────────────────────────────────┘ │
│  75%                                                         │
│                                                              │
│  Phase 3 of 4                                               │
│  🤖 Smart category search (3 AI calls used)                │
│                                                              │
│  ✅ 89 events found  [+ 47 NEW] 🎉                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Search Complete

```
┌─────────────────────────────────────────────────────────────┐
│                   ✓ Search Complete!                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✓ Search complete! Found 124 events                       │
│                                                              │
│  AI Calls Used: 3 / 5 (60%)                                │
│  Time: 28 seconds                                            │
│  Cache Hit: Yes                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Event Results Display

```
┌─────────────────────────────────────────────────────────────┐
│                 Events in Wien - Today                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Filters:  [Alle Events anzeigen (124)]                    │
│           [DJ Sets/Electronic (28)]  [Live-Konzerte (35)]   │
│           [Open Air (15)]  [More...]                        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🎵 Jazz Night at Porgy & Bess                         │  │
│  │ ─────────────────────────────────────────────────────  │  │
│  │ Live-Konzerte                                          │  │
│  │ Fri. 20th Jan 2025, 8:00 pm - 11:00 pm               │  │
│  │ 📍 Porgy & Bess, Vienna                                │  │
│  │ 💰 €15-25                                              │  │
│  │ 🔗 Website | 🎫 Tickets                                │  │
│  │ [AI] 🆕                                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🎭 Theater Performance: Hamlet                         │  │
│  │ ─────────────────────────────────────────────────────  │  │
│  │ Theater/Performance                                    │  │
│  │ Fri. 20th Jan 2025, 7:30 pm                           │  │
│  │ 📍 Burgtheater, Vienna                                 │  │
│  │ 💰 €35-120                                             │  │
│  │ 🔗 Website | 🎫 Tickets                                │  │
│  │ [wien.info]                                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [Load More Events...]                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Mobile View - Optimized Search Active

```
┌────────────────────────┐
│   🔍 Where2Go          │
├────────────────────────┤
│                        │
│  Optimized Search      │
│  ▼▼▼▼▼▼▽▽▽▽▽▽▽▽▽▽▽   │
│  50%                   │
│                        │
│  Phase 2 of 4          │
│  🏛️ Querying venues... │
│                        │
│  📊 67 events found    │
│  [+ 25 NEW] 🎉        │
│                        │
└────────────────────────┘
```

## Error State

```
┌─────────────────────────────────────────────────────────────┐
│                   ⚠ Search Error                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚠ Failed to complete search                                │
│                                                              │
│  The search encountered an error during Phase 2.            │
│  However, 42 events were found from cache.                  │
│                                                              │
│  ┌──────────────────────────────────┐                       │
│  │         🔄 Retry Search           │                       │
│  └──────────────────────────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Progress Badge Animations

**When new events are discovered:**

```
Normal State:
  ✅ 45 events found

New Events Detected (2 seconds):
  ✅ 67 events found  [+ 22 NEW] 🎉
                      ↑
                   Animated slide-in
                   Green background
                   Fades out after 2s
```

## UI States Summary

### 1. Idle State
- Checkbox shown: "Use optimized search (max 5 AI calls) 🚀"
- Unchecked by default
- Regular search button available

### 2. Search Starting
- Progress component appears
- Shows "Initializing..."
- Progress bar at 0%

### 3. Phase Execution (1-4)
- Progress bar updates (0%, 25%, 50%, 75%, 100%)
- Current phase displayed
- Running message shown
- Event count updates in real-time
- "New events" badge appears when count increases

### 4. Success State
- Green checkmark icon ✓
- "Search complete!" message
- Final event count
- AI calls used / 5
- Search time

### 5. Error State
- Warning icon ⚠
- Error message
- Partial results shown if available
- Retry button available

## Responsive Design

**Desktop (>1024px):**
- Full-width progress bar
- Side-by-side phase info and event count
- Larger text and spacing

**Tablet (768-1024px):**
- Stacked progress information
- Slightly reduced padding
- Touch-friendly controls

**Mobile (<768px):**
- Vertical layout
- Compressed progress bar
- Larger touch targets
- Optimized for portrait orientation

## Color Scheme

**Progress Bar:**
- Background: `#e5e7eb` (light gray)
- Fill: Linear gradient `#667eea` → `#764ba2` (purple)

**Badges:**
- New Events: `#10b981` (green) with white text
- Error: `#dc2626` (red) with white text
- Success: `#10b981` (green) with white text

**Text:**
- Primary: `#374151` (dark gray)
- Secondary: `#6b7280` (medium gray)
- Emphasized: `#667eea` (purple)

## Animation Details

1. **Progress Bar Fill**
   - Smooth transition: 0.3s ease
   - Linear gradient animation

2. **New Events Badge**
   - Slide-in from right: 0.3s
   - Fade out after 2s
   - Scale pulse effect

3. **Phase Transitions**
   - Fade between messages: 0.2s
   - Number count-up animation

4. **Success Checkmark**
   - Scale-in effect: 0.4s
   - Bounce animation

## Accessibility

**ARIA Labels:**
- `role="progressbar"` on progress bar
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` for progress
- `aria-live="polite"` for status updates
- `role="status"` for completion messages
- `role="alert"` for error messages

**Keyboard Navigation:**
- Tab-accessible checkbox
- Enter key to toggle
- Focus indicators on all interactive elements

**Screen Reader Announcements:**
- Phase changes announced
- New event counts announced
- Completion/error states announced
