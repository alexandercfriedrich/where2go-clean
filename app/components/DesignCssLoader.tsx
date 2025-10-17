'use client';

import { useEffect } from 'react';

/**
 * Globale Design-Datei-Umschaltung per URL-Parameter ?design=1|2|3|4|5|6|7|8|9
 * - Default: design1.css (statically imported in app/layout.tsx)
 * - Bei ?design=2..9 wird /designs/design{n}.css dynamisch geladen.
 * - base.css wird immer geladen, um strukturelle Garantien zu geben (sichtbare Kategorien/Filter).
 */
export default function DesignCssLoader() {
  useEffect(() => {
    const ensureDesign = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const designParam = params.get('design') || '1';
        const normalized = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(designParam) ? designParam : '1';

        // Theme CSS handling
        const themeId = 'w2g-theme-css';
        let themeLink = document.getElementById(themeId) as HTMLLinkElement | null;

        if (normalized === '1') {
          // Design 1 is already loaded via static import in app/layout.tsx
          // Remove dynamic theme link if it exists to avoid duplication
          if (themeLink) {
            themeLink.remove();
          }
        } else {
          // Load theme CSS for design 2-9
          const targetHref = `/designs/design${normalized}.css`;
          if (!themeLink) {
            themeLink = document.createElement('link');
            themeLink.id = themeId;
            themeLink.rel = 'stylesheet';
            document.head.appendChild(themeLink);
          }
          if (themeLink.getAttribute('href') !== targetHref) {
            themeLink.setAttribute('href', targetHref);
          }
        }

        // Always ensure base.css is loaded AFTER theme CSS
        const baseId = 'w2g-base-css';
        let baseLink = document.getElementById(baseId) as HTMLLinkElement | null;
        const baseHref = '/designs/base.css';

        if (!baseLink) {
          baseLink = document.createElement('link');
          baseLink.id = baseId;
          baseLink.rel = 'stylesheet';
          baseLink.href = baseHref;
          document.head.appendChild(baseLink);
        } else if (baseLink.getAttribute('href') !== baseHref) {
          baseLink.setAttribute('href', baseHref);
        }

        // Ensure base.css comes after theme CSS in DOM order
        if (themeLink && baseLink) {
          if (themeLink.nextSibling !== baseLink) {
            themeLink.parentNode?.insertBefore(baseLink, themeLink.nextSibling);
          }
        }
      } catch {
        // no-op
      }
    };

    // Sofort setzen …
    ensureDesign();
    // … und kurz verzögert nochmal setzen, um spätere Page-Effects sicher zu überstimmen
    const t = setTimeout(ensureDesign, 0);
    const t2 = setTimeout(ensureDesign, 100);

    // Bei Browser-Navigation (Back/Forward) erneut anwenden
    const onPopState = () => ensureDesign();
    window.addEventListener('popstate', onPopState);

    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  return null;
}
