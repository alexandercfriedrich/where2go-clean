@@
-import { buildWienInfoUrl, getWienInfoF1IdsForCategories } from '@/event_mapping_wien_info';
+import { buildWienInfoUrl, getWienInfoF1IdsForCategories } from '@/event_mapping_wien_info';
+import { fetchWienInfoEvents } from '@/lib/sources/wienInfo';
@@
 export async function POST(request: NextRequest) {
   try {
@@
-    // Wien.info Discovery-Link dynamisch hinzufügen (nur Wien)
+    // Wien.info Discovery-Link dynamisch hinzufügen (nur Wien)
@@
     } catch (e) {
       console.warn('Wien.info link generation failed:', (e as Error).message);
     }
 
+    // Frühe Sammelliste für schnelle Quellen (z.B. Wien.info, RSS)
+    let earlyEvents: EventData[] = [];
+
+    // Optional: direkte Wien.info HTML Events (Opt-In)
+    try {
+      const shouldFetchWienInfo =
+        request.nextUrl.searchParams.get('fetchWienInfo') === '1' ||
+        (options && (options as any).fetchWienInfo === true);
+      const isVienna = /(^|\\s)wien(\\s|$)|vienna/.test(city.toLowerCase());
+      if (shouldFetchWienInfo && isVienna) {
+        const wienInfoRaw = await fetchWienInfoEvents({
+          fromISO: date,
+          toISO: date,
+          categories: effectiveCategories,
+          limit: 120,
+          debug: (options as any)?.debug === true || qDebug,
+          debugVerbose: (options as any)?.debugVerbose === true || qVerbose
+        });
+        if (wienInfoRaw.length) {
+          const normalized = wienInfoRaw.map(ev => ({
+            title: ev.title,
+            category: ev.category,
+            date: ev.date,
+            time: ev.time || '',
+            venue: ev.venue || '',
+            price: ev.price || '',
+            website: ev.website || '',
+            source: ev.source,
+            city: ev.city || 'Wien'
+          }));
+            const deduped = eventAggregator.deduplicateEvents(normalized);
+            earlyEvents.push(...deduped);
+            if (qDebug) {
+              console.log('[WIEN.INFO:EARLY]', { count: deduped.length });
+            }
+        }
+      }
+    } catch (e) {
+      console.warn('Wien.info fetch failed:', (e as Error).message);
+    }
+
@@
-    // Wien.gv.at (VADB) RSS – schnelle Vorab-Ergebnisse (nur Wien)
+    // Wien.gv.at (VADB) RSS – schnelle Vorab-Ergebnisse (nur Wien)
@@
-          if (rssResults.length) {
-            // Stamp RSS provenance
+          if (rssResults.length) {
+            // Stamp RSS provenance
             // (Vorhandener Code)
           }
@@
-    return NextResponse.json({ error: 'Unerwarteter Fehler' }, { status: 500 });
+    return NextResponse.json({ error: 'Unerwarteter Fehler' }, { status: 500 });
   }
 }