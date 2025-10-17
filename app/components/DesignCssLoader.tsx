'use client';

import { useEffect } from 'react';

/**
 * Design CSS Loader with base.css structural support
 * - Design 1 is loaded statically in layout.tsx (prevents FOUC)
 * - Only injects theme link when ?design != 1 to avoid double-injection
 * - Always injects base.css AFTER theme to ensure structural guarantees
 * - Preserves delayed re-apply and popstate handling
 */
export default function DesignCssLoader() {
  useEffect(() => {
    const ensureDesign = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const designParam = params.get('design') || '1';
        const normalized = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(designParam) ? designParam : '1';

        const themeId = 'w2g-theme-css';
        const baseId = 'w2g-base-css';

        // Only inject theme link when design != 1 (design1 is already statically loaded)
        if (normalized !== '1') {
          const targetHref = `/designs/design${normalized}.css`;
          let themeLink = document.getElementById(themeId) as HTMLLinkElement | null;

          if (!themeLink) {
            themeLink = document.createElement('link');
            themeLink.id = themeId;
            themeLink.rel = 'stylesheet';
            document.head.appendChild(themeLink);
          }
          if (themeLink.getAttribute('href') !== targetHref) {
            themeLink.setAttribute('href', targetHref);
          }
        } else {
          // Remove theme link if switching back to design 1
          const existingTheme = document.getElementById(themeId);
          if (existingTheme) {
            existingTheme.remove();
          }
        }

        // Always inject base.css AFTER the theme link
        let baseLink = document.getElementById(baseId) as HTMLLinkElement | null;
        const baseHref = '/designs/base.css';

        if (!baseLink) {
          baseLink = document.createElement('link');
          baseLink.id = baseId;
          baseLink.rel = 'stylesheet';
          baseLink.href = baseHref;
          // Append base.css to ensure it's after theme CSS
          document.head.appendChild(baseLink);
        } else if (baseLink.getAttribute('href') !== baseHref) {
          baseLink.setAttribute('href', baseHref);
        }

        // Ensure base.css is always last (after theme)
        if (baseLink.parentNode) {
          baseLink.parentNode.appendChild(baseLink);
        }
      } catch {
        // no-op
      }
    };

    // Apply immediately
    ensureDesign();
    // Delayed re-apply to override any page-level effects
    const t = setTimeout(ensureDesign, 0);
    const t2 = setTimeout(ensureDesign, 100);

    // Re-apply on browser navigation (Back/Forward)
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
