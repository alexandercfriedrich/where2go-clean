// Calendar utility functions for adding events to various calendar services

export interface CalendarEvent {
  title: string;
  startDate: string; // Date in YYYY-MM-DD format
  startTime?: string; // Time in HH:MM format
  endTime?: string; // Time in HH:MM format
  location?: string;
  description?: string;
  website?: string;
}

export interface CalendarProvider {
  name: string;
  id: string;
  icon: string;
  generateUrl: (event: CalendarEvent) => string;
}

// Helper function to format date for calendar URLs
function formatCalendarDate(date: string, time?: string): string {
  const dateObj = new Date(date);
  if (time) {
    const [hours, minutes] = time.split(':');
    dateObj.setHours(parseInt(hours), parseInt(minutes));
  }
  return dateObj.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Helper function to calculate end time if not provided
function getEndDateTime(startDate: string, startTime?: string, endTime?: string): string {
  const startDateTime = new Date(startDate);
  
  if (startTime) {
    const [hours, minutes] = startTime.split(':');
    startDateTime.setHours(parseInt(hours), parseInt(minutes));
  }
  
  if (endTime) {
    const endDateTime = new Date(startDate);
    const [hours, minutes] = endTime.split(':');
    endDateTime.setHours(parseInt(hours), parseInt(minutes));
    return endDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  
  // Default to 2 hours if no end time provided
  const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
  return endDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export const calendarProviders: CalendarProvider[] = [
  {
    name: 'Google Calendar',
    id: 'google',
    icon: 'google',
    generateUrl: (event: CalendarEvent) => {
      const startDateTime = formatCalendarDate(event.startDate, event.startTime);
      const endDateTime = getEndDateTime(event.startDate, event.startTime, event.endTime);
      
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${startDateTime}/${endDateTime}`,
        location: event.location || '',
        details: event.description || (event.website ? `More info: ${event.website}` : ''),
      });
      
      return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }
  },
  {
    name: 'Outlook',
    id: 'outlook',
    icon: 'outlook',
    generateUrl: (event: CalendarEvent) => {
      const startDateTime = formatCalendarDate(event.startDate, event.startTime);
      const endDateTime = getEndDateTime(event.startDate, event.startTime, event.endTime);
      
      const params = new URLSearchParams({
        subject: event.title,
        startdt: startDateTime,
        enddt: endDateTime,
        location: event.location || '',
        body: event.description || (event.website ? `More info: ${event.website}` : ''),
      });
      
      return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
    }
  },
  {
    name: 'Apple Calendar',
    id: 'apple',
    icon: 'apple',
    generateUrl: (event: CalendarEvent) => {
      // Apple Calendar uses webcal:// protocol or .ics file download
      // For simplicity, we'll create a data URL with ICS content
      const startDateTime = formatCalendarDate(event.startDate, event.startTime);
      const endDateTime = getEndDateTime(event.startDate, event.startTime, event.endTime);
      
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Where2Go//Event//EN',
        'BEGIN:VEVENT',
        `DTSTART:${startDateTime}`,
        `DTEND:${endDateTime}`,
        `SUMMARY:${event.title}`,
        event.location ? `LOCATION:${event.location}` : '',
        event.description ? `DESCRIPTION:${event.description}` : '',
        event.website ? `URL:${event.website}` : '',
        'END:VEVENT',
        'END:VCALENDAR'
      ].filter(line => line).join('\n');
      
      return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
    }
  },
  {
    name: 'Yahoo Calendar',
    id: 'yahoo',
    icon: 'yahoo',
    generateUrl: (event: CalendarEvent) => {
      const startDateTime = formatCalendarDate(event.startDate, event.startTime);
      const endDateTime = getEndDateTime(event.startDate, event.startTime, event.endTime);
      
      const params = new URLSearchParams({
        v: '60',
        TITLE: event.title,
        ST: startDateTime,
        ET: endDateTime,
        in_loc: event.location || '',
        DESC: event.description || (event.website ? `More info: ${event.website}` : ''),
      });
      
      return `https://calendar.yahoo.com/?${params.toString()}`;
    }
  }
];

// Detect user's preferred calendar based on user agent
export function getPreferredCalendarProvider(): CalendarProvider {
  if (typeof window === 'undefined') {
    return calendarProviders[0]; // Default to Google on server-side
  }
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('mac') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return calendarProviders.find(p => p.id === 'apple') || calendarProviders[0];
  }
  
  if (userAgent.includes('windows')) {
    return calendarProviders.find(p => p.id === 'outlook') || calendarProviders[0];
  }
  
  // Default to Google Calendar
  return calendarProviders[0];
}

// Generate calendar URL for the preferred provider
export function generatePreferredCalendarUrl(event: CalendarEvent): string {
  const provider = getPreferredCalendarProvider();
  return provider.generateUrl(event);
}

// Convert EventData to CalendarEvent
export function convertEventToCalendarEvent(event: any): CalendarEvent {
  return {
    title: event.title,
    startDate: event.date,
    startTime: event.time,
    endTime: event.endTime,
    location: event.venue + (event.address ? `, ${event.address}` : ''),
    description: event.description,
    website: event.website,
  };
}