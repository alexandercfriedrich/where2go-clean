/**
 * Add to Calendar Utility
 * Generates calendar files for events
 */

interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  url?: string;
}

/**
 * Generate ICS file content for calendar download
 */
export function generateICS(event: CalendarEvent): string {
  const startDate = formatICSDate(event.startDate);
  const endDate = formatICSDate(event.endDate || new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000)); // Default 2 hours
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Where2Go//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${escapeICS(event.title)}`,
    event.description ? `DESCRIPTION:${escapeICS(event.description)}` : '',
    event.location ? `LOCATION:${escapeICS(event.location)}` : '',
    event.url ? `URL:${event.url}` : '',
    `DTSTAMP:${formatICSDate(new Date())}`,
    `UID:${generateUID(event)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(line => line).join('\r\n');

  return icsContent;
}

/**
 * Format date for ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate unique ID for event
 */
function generateUID(event: CalendarEvent): string {
  const timestamp = event.startDate.getTime();
  const hash = simpleHash(event.title + event.location);
  return `${timestamp}-${hash}@where2go.at`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Download ICS file
 */
export function downloadICS(event: CalendarEvent): void {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Generate Google Calendar URL
 */
export function getGoogleCalendarURL(event: CalendarEvent): string {
  const startDate = formatGoogleDate(event.startDate);
  const endDate = formatGoogleDate(event.endDate || new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000));
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDate}/${endDate}`,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Format date for Google Calendar (YYYYMMDDTHHMMSSZ)
 */
function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generate Outlook Calendar URL
 */
export function getOutlookCalendarURL(event: CalendarEvent): string {
  const startDate = event.startDate.toISOString();
  const endDate = (event.endDate || new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000)).toISOString();
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: startDate,
    enddt: endDate,
    body: event.description || '',
    location: event.location || '',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Yahoo Calendar URL
 */
export function getYahooCalendarURL(event: CalendarEvent): string {
  const startDate = formatYahooDate(event.startDate);
  const endDate = formatYahooDate(event.endDate || new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000));
  
  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: startDate,
    et: endDate,
    desc: event.description || '',
    in_loc: event.location || '',
  });

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

/**
 * Format date for Yahoo Calendar (YYYYMMDDTHHMMSSZ)
 */
function formatYahooDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
