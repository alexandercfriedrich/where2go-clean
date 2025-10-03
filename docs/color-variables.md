# Color Variables System

## Overview

The Where2Go application uses a comprehensive CSS custom properties (variables) system for consistent theming across the entire application. The system supports both light and dark modes through CSS media queries.

## File Location

Primary file: `public/designs/style-variables.css`

## Architecture

### Three-Tier Color System

The color system is organized in three tiers:

1. **Primitive Color Tokens** - Base color values
2. **Semantic Color Tokens** - Purpose-based color assignments
3. **Component-Specific Colors** - Contextual color usage

### Primitive Color Tokens

Base colors are defined with descriptive names and shade numbers:

```css
/* Neutrals */
--color-white: rgba(255, 255, 255, 1);
--color-black: rgba(0, 0, 0, 1);
--color-cream-50: rgba(252, 252, 249, 1);
--color-cream-100: rgba(255, 255, 253, 1);
--color-gray-200: rgba(245, 245, 245, 1);
--color-gray-300: rgba(167, 169, 169, 1);
--color-gray-400: rgba(119, 124, 124, 1);

/* Brand Colors */
--color-teal-300: rgba(50, 184, 198, 1);
--color-teal-400: rgba(45, 166, 178, 1);
--color-teal-500: rgba(33, 128, 141, 1);
--color-teal-600: rgba(29, 116, 128, 1);
--color-teal-700: rgba(26, 104, 115, 1);
--color-teal-800: rgba(41, 150, 161, 1);

/* Status Colors */
--color-red-400: rgba(255, 84, 89, 1);
--color-red-500: rgba(192, 21, 47, 1);
--color-orange-400: rgba(230, 129, 97, 1);
--color-orange-500: rgba(168, 75, 47, 1);
```

### RGB Variants for Opacity Control

Many colors have RGB variants (without alpha) for creating custom opacity values:

```css
--color-brown-600-rgb: 94, 82, 64;
--color-teal-500-rgb: 33, 128, 141;
--color-slate-900-rgb: 19, 52, 59;

/* Usage example */
background: rgba(var(--color-teal-500-rgb), 0.4);
```

### Semantic Color Tokens

Semantic tokens provide consistent meaning across the application:

#### Light Mode (Default)
```css
--color-background: var(--color-cream-50);
--color-surface: var(--color-cream-100);
--color-text: var(--color-slate-900);
--color-text-secondary: var(--color-slate-500);
--color-primary: var(--color-teal-500);
--color-primary-hover: var(--color-teal-600);
--color-primary-active: var(--color-teal-700);
--color-border: rgba(var(--color-brown-600-rgb), 0.2);
--color-error: var(--color-red-500);
--color-success: var(--color-teal-500);
--color-warning: var(--color-orange-500);
--color-info: var(--color-slate-500);
```

#### Dark Mode
```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--color-charcoal-700);
    --color-surface: var(--color-charcoal-800);
    --color-text: var(--color-gray-200);
    --color-text-secondary: rgba(var(--color-gray-300-rgb), 0.7);
    --color-primary: var(--color-teal-300);
    --color-error: var(--color-red-400);
    /* ... and more */
  }
}
```

### Background Color Tokens

Eight predefined background colors for cards, badges, and UI elements:

```css
/* Light Mode */
--color-bg-1: rgba(59, 130, 246, 0.08);   /* Light blue */
--color-bg-2: rgba(245, 158, 11, 0.08);   /* Light yellow */
--color-bg-3: rgba(34, 197, 94, 0.08);    /* Light green */
--color-bg-4: rgba(239, 68, 68, 0.08);    /* Light red */
--color-bg-5: rgba(147, 51, 234, 0.08);   /* Light purple */
--color-bg-6: rgba(249, 115, 22, 0.08);   /* Light orange */
--color-bg-7: rgba(236, 72, 153, 0.08);   /* Light pink */
--color-bg-8: rgba(6, 182, 212, 0.08);    /* Light cyan */
```

## Additional Design Tokens

### Typography
```css
--font-family-base: "FKGroteskNeue", "Geist", "Inter", -apple-system, ...;
--font-family-mono: "Berkeley Mono", ui-monospace, ...;
--font-size-base: 14px;
--font-weight-medium: 500;
--line-height-normal: 1.5;
--letter-spacing-tight: -0.01em;
```

### Spacing
```css
--space-4: 4px;
--space-8: 8px;
--space-12: 12px;
--space-16: 16px;
--space-24: 24px;
--space-32: 32px;
```

### Border Radius
```css
--radius-sm: 6px;
--radius-base: 8px;
--radius-md: 10px;
--radius-lg: 12px;
--radius-full: 9999px;
```

### Shadows
```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.02);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.04), ...;
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.04), ...;
--shadow-inset-sm: inset 0 1px 0 rgba(255, 255, 255, 0.15), ...;
```

### Animation
```css
--duration-fast: 150ms;
--duration-normal: 250ms;
--ease-standard: cubic-bezier(0.16, 1, 0.3, 1);
```

### Layout Breakpoints
```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
```

## Usage Examples

### Basic Usage
```css
.card {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-16);
  box-shadow: var(--shadow-sm);
}
```

### With Opacity
```css
.overlay {
  background: rgba(var(--color-slate-900-rgb), 0.8);
}

.highlight {
  background: rgba(var(--color-teal-500-rgb), 0.15);
}
```

### Interactive States
```css
.button {
  background: var(--color-primary);
  color: var(--color-btn-primary-text);
  transition: background var(--duration-fast) var(--ease-standard);
}

.button:hover {
  background: var(--color-primary-hover);
}

.button:active {
  background: var(--color-primary-active);
}

.button:focus-visible {
  outline: var(--focus-outline);
  box-shadow: var(--focus-ring);
}
```

### Status Colors
```css
.error-message {
  color: var(--color-error);
  background: rgba(var(--color-error-rgb), 0.1);
}

.success-badge {
  color: var(--color-success);
  background: rgba(var(--color-success-rgb), 0.15);
}
```

## Dark Mode Support

The system automatically switches to dark mode colors when the user's system preference is set to dark mode:

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* All semantic tokens are redefined for dark mode */
  }
}
```

This approach ensures:
- **Automatic Adaptation**: Respects user's system preference
- **Consistent Semantics**: Same variable names work in both modes
- **No JavaScript Required**: Pure CSS solution
- **Smooth Transitions**: Colors adjust instantly when preference changes

## Best Practices

### DO:
✅ Use semantic tokens (`--color-primary`, `--color-text`) for most styling
✅ Use RGB variants when you need custom opacity
✅ Reference primitive tokens only when creating new semantic tokens
✅ Use spacing, typography, and layout tokens for consistency
✅ Test your components in both light and dark modes

### DON'T:
❌ Hardcode color values (use variables instead)
❌ Use primitive tokens directly in components (use semantic tokens)
❌ Create custom colors without adding them to the system
❌ Override dark mode colors without good reason
❌ Use hex colors (use rgba for consistency and opacity support)

## Extending the System

### Adding New Semantic Tokens

1. Add the light mode value to the `:root` block
2. Add the dark mode value to the `@media (prefers-color-scheme: dark)` block
3. Document the token's purpose and usage
4. Update this documentation

### Adding New Primitive Colors

1. Define the color in rgba format with descriptive name and shade number
2. Create an RGB variant if opacity control is needed
3. Map it to appropriate semantic tokens
4. Ensure it works well in both light and dark modes

## Related Files

- `public/designs/style-variables.css`: Main variables file
- `public/designs/design1.css`: Design system 1 styles
- `public/designs/design2.css`: Design system 2 styles
- `app/globals.css`: Global application styles
