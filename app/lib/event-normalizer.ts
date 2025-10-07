import { EventData } from './types';

// Normalizer, der 'source' durchlässt
export function normalizeEvents(events: any[]): EventData[] {
  return (events || []).map((e) => {
    return {
      title: e.title ?? '',
      category: e.category ?? '',
      date: e.date ?? '',
      time: e.time ?? '',
      venue: e.venue ?? '',
      price: e.price ?? '',
      website: e.website ?? '',
      endTime: e.endTime,
      address: e.address,
      ticketPrice: e.ticketPrice,
      eventType: e.eventType,
      description: e.description,
      bookingLink: e.bookingLink,
      ageRestrictions: e.ageRestrictions,
      source: e.source as 'cache' | 'rss' | 'ai' | undefined,
      imageUrl: e.imageUrl
    };
  });
}
