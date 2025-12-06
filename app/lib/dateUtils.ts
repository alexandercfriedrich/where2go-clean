/**
 * Date Utility Functions
 * Shared date formatting and parsing functions for event displays
 */

/**
 * Format a date string in German format (e.g., "Mi. 25. Dez 2024")
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Formatted German date string
 */
export function formatGermanDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('de-DE', options);
  } catch {
    return dateStr;
  }
}

/**
 * Parse date badge text from German formatted date (e.g., "DEZ 07")
 * @param formattedDate - German formatted date string
 * @returns Object with month abbreviation and day number
 */
export function parseDateBadge(formattedDate: string): { month: string; day: string } {
  // Format: "Mi., 25.12.2024" -> Extract month and day
  const parts = formattedDate.split('.');
  if (parts.length >= 2) {
    const day = parts[0].trim().replace(/\D/g, ''); // Extract day number
    const monthNum = parts[1].trim();
    
    // Convert month number to German abbreviation
    const months = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];
    const monthIndex = parseInt(monthNum, 10) - 1;
    const month = months[monthIndex] || '';
    
    return { month, day };
  }
  
  return { month: '', day: '' };
}

/**
 * Format event date and time from ISO strings
 * @param dateStr - ISO date string
 * @param startTime - Start time string (HH:mm)
 * @param endTime - Optional end time string (HH:mm)
 * @returns Object with formatted date and time strings
 */
export function formatEventDateTime(dateStr: string, startTime?: string, endTime?: string): { date: string; time: string } {
  const date = formatGermanDate(dateStr);
  
  // Format time
  const formatTime = (timeStr?: string): string => {
    if (!timeStr) return '';
    const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return timeStr;
    
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? 'pm' : 'am';
    
    hours = hours % 12;
    if (hours === 0) hours = 12;
    
    return `${hours}:${minutes} ${period}`;
  };
  
  let time = '';
  if (startTime && endTime) {
    time = `${formatTime(startTime)} - ${formatTime(endTime)}`;
  } else if (startTime) {
    time = formatTime(startTime);
  }
  
  return { date, time };
}
