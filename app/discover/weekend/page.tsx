/**
 * Weekend Page - Weekend Events
 */

import { Metadata } from 'next';
import { getWeekendEvents } from '../../../lib/events/queries';
import { WeekendClient } from './WeekendClient';

export const metadata: Metadata = {
  title: 'This Weekend - Weekend Events | Where2Go',
  description: 'Plan your perfect weekend with events happening Friday to Monday',
};

export default async function WeekendPage({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  const city = searchParams.city || 'Wien';
  
  let events: any[] = [];
  try {
    events = await getWeekendEvents({ city, limit: 100 });
  } catch (error) {
    console.error('Error fetching weekend events:', error);
  }

  return <WeekendClient initialEvents={events} city={city} />;
}
