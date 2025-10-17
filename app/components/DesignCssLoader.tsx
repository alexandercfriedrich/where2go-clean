'use client';

import { useEffect } from 'react';

/**
 * Globale Design-Datei-Umschaltung per URL-Parameter ?design=1|2|3|4|5|6|7|8|9
 * - Default: design1.css
 * - Bei ?design=2 wird /designs/design2.css geladen.
 * - Erzwingt das Ziel-CSS auch dann, wenn einzelne Pages vorher design1.css gesetzt haben.
 * - Lädt immer base.css NACH dem Theme, um strukturelle Sichtbarkeit zu garantieren.
 */
export default function DesignCssLoader() {
  useEffect(() => {
    const ensureDesign = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const designParam = params.get('design') || '1';
        const normalized = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(designParam) ? designParam : '1';
        const themeHref = `/designs/design${normalized}.css`;
        const baseHref = '/designs/base.css';

        // 1. Load theme CSS (design1-9)
        const themeId = 'w2g-theme-css';
        let themeLink = document.getElementById(themeId) as HTMLLinkElement | null;

        if (!themeLink) {
          themeLink = document.createElement('link');
          themeLink.id = themeId;
          themeLink.rel = 'stylesheet';
          document.head.appendChild(themeLink);
        }
        if (themeLink.getAttribute('href') !== themeHref) {
          themeLink.setAttribute('href', themeHref);
        }

        // 2. Load base CSS AFTER theme to ensure structural overrides
        const baseId = 'w2g-base-css';
        let baseLink = document.getElementById(baseId) as HTMLLinkElement | null;

        if (!baseLink) {
          baseLink = document.createElement('link');
          baseLink.id = baseId;
          baseLink.rel = 'stylesheet';
          document.head.appendChild(baseLink);
        }
        if (baseLink.getAttribute('href') !== baseHref) {
          baseLink.setAttribute('href', baseHref);
        }

        // Ensure base.css comes after theme CSS in the DOM
        if (themeLink.nextSibling !== baseLink) {
          document.head.insertBefore(baseLink, themeLink.nextSibling);
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
