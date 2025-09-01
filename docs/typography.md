# Typography Setup for Design 1

## Font Family: Söhne Breit Leicht

Design 1 uses "Söhne Breit Leicht" as the primary font family with fallbacks to Inter and system fonts.

### Self-Hosting Instructions

To use the Söhne Breit font family in your application:

1. **Obtain Font Files**
   - Download the Söhne Breit Leicht font files (.woff2, .woff formats recommended)
   - Ensure you have proper licensing for web use

2. **File Structure**
   ```
   public/
   └── fonts/
       └── soehne-breit/
           ├── soehne-breit-leicht.woff2
           ├── soehne-breit-leicht.woff
           └── soehne-breit-leicht.ttf (optional backup)
   ```

3. **CSS Implementation**
   Add the following @font-face declarations to your design1.css:

   ```css
   @font-face {
     font-family: 'Söhne Breit Leicht';
     src: url('/fonts/soehne-breit/soehne-breit-leicht.woff2') format('woff2'),
          url('/fonts/soehne-breit/soehne-breit-leicht.woff') format('woff');
     font-weight: 300;
     font-style: normal;
     font-display: swap;
   }
   ```

4. **Font Stack Usage**
   The design uses this font stack for maximum compatibility:
   ```css
   font-family: 'Söhne Breit Leicht', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
   ```

### Notes

- Font files are NOT included in this repository for licensing reasons
- The fallback fonts (Inter, system fonts) provide excellent compatibility
- Font loading uses `font-display: swap` for better performance
- Consider preloading critical font files for better performance

### Performance Optimization

Add this to your HTML head for better font loading:
```html
<link rel="preload" href="/fonts/soehne-breit/soehne-breit-leicht.woff2" as="font" type="font/woff2" crossorigin>
```