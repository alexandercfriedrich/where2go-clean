/**
 * Trending Page - Popular Events
 */

import { Metadata } from 'next';
import { getTrendingEvents } from '../../../lib/events/queries';
import { TrendingClient } from './TrendingClient';

export const metadata: Metadata = {
  title: 'Trending Now - Popular Events | Where2Go',
  description: 'Discover the most popular and trending events everyone is talking about',
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
