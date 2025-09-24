@@
 export interface QueryOptions {
   temperature?: number;
   max_tokens?: number;
   debug?: boolean;
   disableCache?: boolean;
   expandedSubcategories?: boolean;
   forceAllCategories?: boolean;
   minEventsPerCategory?: number;
   categoryTimeoutMs?: number;
   overallTimeoutMs?: number;
   maxAttempts?: number;
   categoryConcurrency?: number;
   hotCity?: any;
   additionalSources?: any[];
+  fetchWienInfo?: boolean; // NEU: optionaler Opt-In für direkte wien.info HTML Events
 }
 
@@
 // Hot City Datensatz
 export interface HotCity {
   id: string;
   name: string;
   country?: string;
   // bisher: websites (verwaltet in Admin)
   websites: HotCityWebsite[];
+  // NEU: strukturierte Venues
+  venues?: HotCityVenue[];
   createdAt: Date;
   updatedAt: Date;
 }
+
+// NEU: einzelnes Venue in einer Hot City
+export interface HotCityVenue {
+  id: string;
+  name: string;
+  categories: string[];
+  description?: string;
+  priority: number;
+  isActive: boolean;
+  isVenue: true;
+  isVenuePrioritized?: boolean;
+  address: {
+    full: string;
+    street: string;
+    houseNumber: string;
+    postalCode: string;
+    city: string;
+    country: string;
+  };
+  website?: string;
+  eventsUrl?: string;
+  aiQueryTemplate?: string;
+}