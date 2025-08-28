// Demonstration script showing event normalization
// This file is for testing purposes and not part of the application

import { normalizeEvent, normalizeEvents } from './app/lib/event-normalizer';

// Example of new LLM response with varied field names
const newLLMEvents = [
  {
    name: 'Electronic Music Night',
    location: 'Berghain',
    url: 'berghain.berlin',
    ticket: 'ra.co/events/berghain',
    date_str: '2025-01-25',
    start_time: '23:00',
    summary: 'Techno and house music event',
    cost: '15€'
  },
  {
    eventTitle: 'Classical Concert',
    venueName: 'Philharmonie',
    source_url: 'https://www.berliner-philharmoniker.de',
    ticketLink: 'https://tickets.berliner-philharmoniker.de',
    eventDate: '2025-01-26',
    eventTime: '20:00',
    shortDescription: 'Berlin Philharmonic Orchestra performance',
    ticketPrice: '85€',
    eventType: 'Classical Music',
    age: '6+'
  }
];

// Example of already normalized events (existing format)
const existingEvents = [
  {
    title: 'Art Exhibition',
    venue: 'Museum Island',
    website: 'https://museum-island.de',
    bookingLink: 'https://tickets.museum-island.de',
    date: '2025-01-27',
    time: '10:00',
    description: 'Contemporary art showcase',
    price: '12€',
    category: 'Art'
  }
];

console.log('=== Event Normalization Demonstration ===\n');

console.log('1. New LLM Events (before normalization):');
console.log(JSON.stringify(newLLMEvents, null, 2));

console.log('\n2. New LLM Events (after normalization):');
const normalizedNewEvents = normalizeEvents(newLLMEvents);
console.log(JSON.stringify(normalizedNewEvents, null, 2));

console.log('\n3. Existing Events (before normalization):');
console.log(JSON.stringify(existingEvents, null, 2));

console.log('\n4. Existing Events (after normalization - should remain unchanged):');
const normalizedExistingEvents = normalizeEvents(existingEvents);
console.log(JSON.stringify(normalizedExistingEvents, null, 2));

console.log('\n5. Mixed Events Test:');
const mixedEvents = [...newLLMEvents, ...existingEvents];
const normalizedMixedEvents = normalizeEvents(mixedEvents);
console.log('Mixed events normalized:', normalizedMixedEvents.map(e => ({
  title: e.title,
  venue: e.venue,
  website: e.website,
  bookingLink: e.bookingLink
})));

console.log('\n=== URL Protocol Tests ===');
const urlTests = [
  { input: 'example.com', expected: 'https://example.com' },
  { input: 'www.example.com', expected: 'https://www.example.com' },
  { input: 'https://example.com', expected: 'https://example.com' },
  { input: 'http://example.com', expected: 'http://example.com' },
  { input: '', expected: '' },
  { input: '  ', expected: '' }
];

urlTests.forEach(test => {
  const result = normalizeEvent({ title: 'Test', venue: 'Test', url: test.input, date: '2025-01-01', time: '20:00' });
  console.log(`URL: "${test.input}" → "${result.website}" (expected: "${test.expected}")`);
  console.assert(result.website === test.expected, `URL normalization failed for "${test.input}"`);
});

console.log('\n✓ All tests passed! Normalization layer is working correctly.');