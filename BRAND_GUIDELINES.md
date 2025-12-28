# Where2Go Brand Guidelines & Design System

## Overview
Where2Go's design system is inspired by Perplexity's clean, minimalist aesthetic, adapted for a travel and events platform. The design emphasizes clarity, accessibility, and a sense of discovery.

## Color Palette

### Core Brand Colors

#### Offblack (#091717)
- **Usage**: Deep, almost-black dark gray for backgrounds in Dark Mode
- **Purpose**: Main background for dark theme, provides elegant depth
- **Accessibility**: Excellent contrast with light text

#### Paper White (#FCFAF6)
- **Usage**: Warm, creamy white for backgrounds in Light Mode
- **Purpose**: Main background for light theme, inviting and comfortable
- **Accessibility**: Optimal readability with dark text

#### True Turquoise (#20B8CD)
- **Usage**: The signature turquoise brand color for accents
- **Purpose**: CTAs, links, icons, active states
- **Consistency**: Same color in both light and dark modes for brand recognition

### Secondary Colors - Blue/Teal Gradient

#### Teal Dark (#13343B)
- **Usage**: Surfaces and elevated elements in Dark Mode
- **Example**: Card backgrounds, panels in dark theme

#### Teal Medium (#2E565D)
- **Usage**: Secondary UI elements
- **Example**: Secondary surfaces, borders in dark mode

#### Peacock (#218090)
- **Usage**: Hover states and call-to-actions
- **Example**: Button hover effects, interactive elements

#### Sky (#BADFDE)
- **Usage**: Subtle accents and light components
- **Example**: Secondary text in dark mode, success states

### Accent Colors - Warm Tones

#### Ecru (#E5E3D4)
- **Usage**: Neutral beige tone for surfaces
- **Example**: Secondary surfaces in light mode, subtle borders

#### Apricot (#FFD2A6)
- **Usage**: Positive messages and highlights
- **Example**: Success notifications, featured content

#### Terra Cotta (#A94B30)
- **Usage**: Warnings and important notices
- **Example**: Warning messages, important alerts

#### Boysenberry (#954456)
- **Usage**: Errors and critical states
- **Example**: Error messages, critical alerts

## Typography System

### Font Families

#### Primary: Space Grotesk
- **Weights**: Bold (700), SemiBold (600), Regular (400)
- **Usage**: Headlines (H1, H2), UI elements, accent text
- **Source**: Google Fonts (Open Source)
- **Import**: `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap`

#### Secondary: Manrope
- **Weights**: Bold (700), Medium (500), Regular (400)
- **Usage**: Body text, descriptions, metadata, H3 headings
- **Source**: Google Fonts (Open Source)
- **Import**: `https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700&display=swap`

### Typography Hierarchy

#### H1 (Hero Headlines)
- **Font**: Space Grotesk Bold
- **Size**: 48-64px (Desktop), 32-40px (Mobile)
- **Line Height**: 1.1
- **Letter Spacing**: -0.02em
- **Usage**: Page titles, hero sections

#### H2 (Section Titles)
- **Font**: Space Grotesk SemiBold
- **Size**: 36-42px (Desktop), 28-32px (Mobile)
- **Line Height**: 1.2
- **Letter Spacing**: -0.01em
- **Usage**: Section headers, major divisions

#### H3 (Subsections)
- **Font**: Manrope Bold
- **Size**: 24-28px (Desktop), 20-24px (Mobile)
- **Line Height**: 1.3
- **Usage**: Subsection headers, card titles

#### Body Text
- **Font**: Manrope Regular
- **Size**: 16-18px (Desktop), 15-16px (Mobile)
- **Line Height**: 1.6
- **Usage**: Main content, descriptions

#### UI Elements
- **Font**: Space Grotesk Regular
- **Size**: 14-16px
- **Line Height**: 1.4
- **Usage**: Buttons, navigation, labels

#### Captions
- **Font**: Manrope Regular
- **Size**: 12-14px
- **Line Height**: 1.5
- **Usage**: Small text, metadata, timestamps

## Color Application

### Light Mode

#### Backgrounds
- **Primary Background**: #FCFAF6 (Paper White) - Main page background
- **Surface/Cards**: #FFFFFF (Pure White) - Elevated content areas
- **Secondary Surface**: #E5E3D4 (Ecru) - Subtle separations

#### Text
- **Primary Text**: #091717 (Offblack) - Headings and body text
- **Secondary Text**: #2E565D (Teal Medium) - Descriptions and metadata

#### Interactive Elements
- **Accent Primary**: #20B8CD (True Turquoise) - CTAs, links, icons
- **Accent Hover**: #218090 (Peacock) - Hover states
- **Borders**: #E5E3D4 (Ecru) - Fine dividing lines

#### Semantic Colors
- **Success**: #218090 (Peacock) - Booking confirmations
- **Warning**: #FFD2A6 (Apricot) - Important notices

### Dark Mode

#### Backgrounds
- **Primary Background**: #091717 (Offblack) - Main page background
- **Surface/Cards**: #13343B (Teal Dark) - Elevated panels
- **Secondary Surface**: #2E565D (Teal Medium) - Additional layering

#### Text
- **Primary Text**: #FCFAF6 (Paper White) - Headings and body text
- **Secondary Text**: #BADFDE (Sky) - Descriptions and secondary info

#### Interactive Elements
- **Accent Primary**: #20B8CD (True Turquoise) - CTAs, links, icons (same as light mode)
- **Accent Hover**: Lighter #20B8CD with glow effect
- **Borders**: #2E565D (Teal Medium) - Subtle dividing lines

#### Semantic Colors
- **Success**: #BADFDE (Sky) - Positive feedback
- **Warning**: #A94B30 (Terra Cotta) - Better visibility in dark mode

## Component Styles

### Buttons

#### Primary CTA (Turquoise)
```css
background: #20B8CD
color: #FCFAF6
border-radius: 8px
padding: 12px 24px
hover: #218090 with subtle elevation
```

#### Secondary Button
```css
background: transparent
border: 2px solid #20B8CD
color: #20B8CD
hover: background #20B8CD, color #FCFAF6
```

### Cards

#### Light Mode Cards
```css
background: #FFFFFF
border: 1px solid #E5E3D4
border-radius: 12px
box-shadow: 0 2px 8px rgba(9, 23, 23, 0.08)
hover: box-shadow: 0 4px 16px rgba(32, 184, 205, 0.12)
```

#### Dark Mode Cards
```css
background: #13343B
border: 1px solid #2E565D
border-radius: 12px
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)
hover: border: 1px solid #20B8CD with subtle glow
```

### Iconography
- **Style**: Outlined icons (2px stroke weight)
- **Primary Color**: #20B8CD (Turquoise)
- **Sizes**: 20px, 24px, 32px (8px grid system)
- **Recommended Libraries**: Heroicons, Lucide, or Phosphor Icons

## Spacing & Layout

### Spacing Scale
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px

### Layout Guidelines
- **Whitespace**: 24-32px between sections
- **Card Padding**: 24-32px internal
- **Grid System**: 12-column grid with 16-24px gutters
- **Max Content Width**: 1200-1400px for optimal readability

## Design Principles

1. **Minimalism**: Reduced, clean interfaces without unnecessary elements
2. **Consistency**: Uniform appearance across all touchpoints
3. **Accessibility**: Approachable despite technical sophistication
4. **Curiosity**: Visuals that invite exploration
5. **Transparency**: Clear hierarchies and understandable structures

## Responsive Breakpoints
- **Mobile**: 320px - 768px (Mobile-first approach)
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+
- **Touch Targets**: Minimum 44px for accessibility

## Brand Assets

### Logo
- **Color**: #20B8CD (True Turquoise)
- **Usage**: Consistent turquoise across all applications
- **Variations**: Full logo, icon-only version

## Implementation Notes

### CSS Custom Properties
All colors and design tokens should be defined as CSS custom properties for easy theming and maintenance. See `public/designs/design1.css` for reference implementation.

### Dark Mode Toggle
The application supports a dark mode toggle that switches between light and dark color schemes while maintaining the turquoise accent color for brand consistency.

### Accessibility Standards
All color combinations must meet WCAG AA contrast standards (4.5:1 for normal text, 3:1 for large text).

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Maintained By**: Where2Go Design Team
