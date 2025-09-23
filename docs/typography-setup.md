## Typography Setup for Design 2 (Minimalist)

## Font Family: Söhne Breit Leicht

Design 2 nutzt "Söhne Breit Leicht" als primäre Schrift mit Fallback zu Inter und System-Fonts.

### Self-Hosting Instructions

1. Font-Dateien beschaffen
   - WOFF2/WOFF (empfohlen), Lizenz für Web-Einsatz sicherstellen

2. Dateistruktur
   ```
   public/
   └── fonts/
       └── soehne-breit/
           ├── soehne-breit-leicht.woff2
           ├── soehne-breit-leicht.woff
           └── soehne-breit-leicht.ttf (optional)
   ```

3. CSS aktivieren
   - In `public/designs/design2.css` den `@font-face` Block am Kopf ent-kommentieren.

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

4. Font-Stack
   - Wird über die CSS-Variable gesetzt:
   ```css
   --font-family-primary: 'Söhne Breit Leicht', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
   ```

### Performance

Optional Preload im Head:
```html
<link rel="preload" href="/fonts/soehne-breit/soehne-breit-leicht.woff2" as="font" type="font/woff2" crossorigin>
```

### Hinweis
- Ohne Font-Dateien greift automatisch der Fallback (Inter/System).
