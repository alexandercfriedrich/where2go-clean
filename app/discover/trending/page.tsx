/**
 * Trending Page - Popular Events
 */

import { Metadata } from 'next';
import { getTrendingEvents } from '../../../lib/events/queries';
import { TrendingClient } from './TrendingClient';

export const metadata: Metadata = {
  title: 'Gerade angesagt - Beliebte Events | Where2Go',
  description: 'Entdecke die beliebtesten und angesagtesten Events über die alle reden',
};

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  const city = searchParams.city || 'Wien';
  
  let events: any[] = [];
  try {
    events = await getTrendingEvents({ city, limit: 100 });
  } catch (error) {
    console.error('Error fetching trending events:', error);
  }

  return <TrendingClient initialEvents={events} city={city} />;
}
