# Manual Verification Guide for Design CSS Implementation

## Testing Steps

### 1. Default Design (no query parameter)
**URL:** `http://localhost:3000/`

**Expected Behavior:**
- design1.css loaded via static import in app/layout.tsx
- base.css loaded dynamically via DesignCssLoader
- No w2g-theme-css link in DOM (design1 is static)
- w2g-base-css link exists and points to /designs/base.css
- Categories section visible
- Filters visible and accessible

**Verification:**
```javascript
// Open browser console and run:
document.getElementById('w2g-theme-css') === null // should be true
document.getElementById('w2g-base-css')?.getAttribute('href') === '/designs/base.css' // should be true
```

### 2. Design 2
**URL:** `http://localhost:3000/?design=2`

**Expected Behavior:**
- w2g-theme-css link exists and points to /designs/design2.css
- w2g-base-css link exists and points to /designs/base.css
- base.css appears after theme CSS in DOM
- Categories and filters remain visible

**Verification:**
```javascript
document.getElementById('w2g-theme-css')?.getAttribute('href') === '/designs/design2.css' // should be true
document.getElementById('w2g-base-css')?.getAttribute('href') === '/designs/base.css' // should be true
```

### 3. Design 7 (Previously had off-canvas filters)
**URL:** `http://localhost:3000/?design=7`

**Expected Behavior:**
- w2g-theme-css link exists and points to /designs/design7.css
- w2g-base-css overrides any off-canvas positioning
- .filter-sidebar is sticky and visible (not right: -300px)
- Categories remain visible
- No elements hidden off-screen

**Verification:**
```javascript
document.getElementById('w2g-theme-css')?.getAttribute('href') === '/designs/design7.css' // should be true
const filterSidebar = document.querySelector('.filter-sidebar');
const styles = window.getComputedStyle(filterSidebar);
styles.position === 'sticky' // should be true
styles.visibility === 'visible' // should be true
```

### 4. Static Pages (ueber-uns, datenschutz)
**URLs:**
- `http://localhost:3000/ueber-uns`
- `http://localhost:3000/datenschutz`

**Expected Behavior:**
- No page-level CSS injection conflicts
- DesignCssLoader handles all design switching
- Design parameter is respected if present
- No console errors

### 5. Mobile Responsive Test
**URL:** `http://localhost:3000/?design=7` (or any design)

**Steps:**
1. Open browser DevTools
2. Enable mobile device emulation (e.g., iPhone 12)
3. Verify filters remain accessible

**Expected Behavior:**
- Filters switch to relative positioning on mobile
- Categories remain visible
- No off-canvas hidden elements

### 6. Browser Navigation Test
**Steps:**
1. Navigate to `/?design=2`
2. Click a link to go to another page
3. Use browser back button
4. Verify design persists

**Expected Behavior:**
- popstate event handler ensures design is reapplied
- No flash of unstyled content

### 7. Invalid Design Parameter
**URL:** `http://localhost:3000/?design=99`

**Expected Behavior:**
- Falls back to design1 (default)
- No w2g-theme-css link created
- base.css still loaded

## Console Checks

Run in browser console to verify implementation:

```javascript
// Check what's loaded
console.log('Theme CSS:', document.getElementById('w2g-theme-css')?.getAttribute('href'));
console.log('Base CSS:', document.getElementById('w2g-base-css')?.getAttribute('href'));

// Check filter visibility
const filterSidebar = document.querySelector('.filter-sidebar');
if (filterSidebar) {
  const styles = window.getComputedStyle(filterSidebar);
  console.log('Filter sidebar position:', styles.position);
  console.log('Filter sidebar visibility:', styles.visibility);
  console.log('Filter sidebar right:', styles.right);
}

// Check categories visibility
const categoriesSection = document.querySelector('.categories-section');
if (categoriesSection) {
  const styles = window.getComputedStyle(categoriesSection);
  console.log('Categories display:', styles.display);
  console.log('Categories visibility:', styles.visibility);
}
```

## Success Criteria

✅ All CSS files load without 404 errors
✅ No duplicate theme CSS when ?design=1
✅ base.css always loads after theme CSS
✅ Categories and filters always visible across all designs
✅ Filter sidebar not off-canvas (especially in design7)
✅ No console errors related to missing link IDs
✅ Responsive behavior works on mobile
✅ Static pages (ueber-uns, datenschutz) work without conflicts
