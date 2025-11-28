/**
 * For You Page - Personalized Events
 */

import { Metadata } from 'next';
import { getPersonalizedEvents } from '../../../lib/events/queries';
import { ForYouClient } from './ForYouClient';

export const metadata: Metadata = {
  title: 'For You - Personalized Events | Where2Go',
  description: 'Your personalized event recommendations based on your interests and preferences',
};

export default async function ForYouPage({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  const city = searchParams.city || 'Wien';
  
  let events: any[] = [];
  try {
    events = await getPersonalizedEvents({ city, limit: 100 });
  } catch (error) {
    console.error('Error fetching personalized events:', error);
  }

  return <ForYouClient initialEvents={events} city={city} />;
}
