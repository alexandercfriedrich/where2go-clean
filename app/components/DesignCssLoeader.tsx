'use client';

import { useEffect } from 'react';

/**
 * Globale Design-Datei-Umschaltung per URL-Parameter ?design=1|2|3
 * - Default: design1.css
 * - Bei ?design=2 wird /designs/design2.css geladen.
 * - Erzwingt das Ziel-CSS auch dann, wenn einzelne Pages vorher design1.css gesetzt haben.
 */
export default function DesignCssLoader() {
  useEffect(() => {
    const ensureDesign = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const designParam = params.get('design') || '1';
        const normalized = ['1', '2', '3'].includes(designParam) ? designParam : '1';
        const targetHref = `/designs/design${normalized}.css`;

        const id = 'w2g-design-css';
        let link = document.getElementById(id) as HTMLLinkElement | null;

        if (!link) {
          link = document.createElement('link');
          link.id = id;
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
        if (link.getAttribute('href') !== targetHref) {
          link.setAttribute('href', targetHref);
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
