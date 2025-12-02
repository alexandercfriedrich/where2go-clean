/**
 * Slug Health Check
 * Monitors slug integrity across the system
 */

import { supabase } from '@/lib/supabase/client';

export interface SlugHealthReport {
  totalEvents: number;
  eventsWithSlug: number;
  eventsWithoutSlug: number;
  missingSlugPercentage: number;
  sampleMissingEvents: Array<{
    id: string;
    title: string;
    source: string;
    date: string;
  }>;
}

// Type for the query result
interface EventSlugRow {
  id: string;
  title: string;
  source: string | null;
  start_date_time: string;
}

export async function checkSlugHealth(): Promise<SlugHealthReport> {
  // Reuses shared Supabase client instead of creating new instance each call
  
  // Get total count
  const { count: totalEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });
  
  // Get count with slugs
  const { count: eventsWithSlug } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .not('slug', 'is', null);
  
  // Get sample of events without slugs
  const { data: sampleMissing } = await supabase
    .from('events')
    .select('id, title, source, start_date_time')
    .is('slug', null)
    .order('start_date_time', { ascending: false })
    .limit(10);
  
  const eventsWithoutSlug = (totalEvents || 0) - (eventsWithSlug || 0);
  const missingPercentage = totalEvents 
    ? (eventsWithoutSlug / totalEvents) * 100 
    : 0;
  
  // Cast to known type for processing
  const missingEvents = (sampleMissing || []) as EventSlugRow[];
  
  const report: SlugHealthReport = {
    totalEvents: totalEvents || 0,
    eventsWithSlug: eventsWithSlug || 0,
    eventsWithoutSlug,
    missingSlugPercentage: parseFloat(missingPercentage.toFixed(2)),
    sampleMissingEvents: missingEvents.map(e => ({
      id: e.id,
      title: e.title,
      source: e.source || 'unknown',
      date: e.start_date_time,
    })),
  };
  
  // Alert if more than 1% of events are missing slugs
  if (missingPercentage > 1) {
    console.error(
      `❌ HIGH PERCENTAGE OF MISSING SLUGS: ${missingPercentage.toFixed(2)}%`,
      report
    );
  } else if (missingPercentage > 0) {
    console.warn(
      `⚠️ Some events missing slugs: ${missingPercentage.toFixed(2)}%`,
      report
    );
  } else {
    console.info('✅ All events have slugs');
  }
  
  return report;
}
