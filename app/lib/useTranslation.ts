'use client';

import { useState, useEffect } from 'react';
import { getBrowserLanguage, getTranslation, type SupportedLanguage, type Translations } from './i18n';

export function useTranslation() {
  const [language, setLanguage] = useState<SupportedLanguage>('de');

  useEffect(() => {
    const detectedLanguage = getBrowserLanguage();
    setLanguage(detectedLanguage);
  }, []);

  const t = (key: keyof Translations): string => {
    return getTranslation(language, key);
  };

  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    const locale = language === 'de' ? 'de-DE' : 'en-US';
    return date.toLocaleDateString(locale, options);
  };

  const formatTime = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    const locale = language === 'de' ? 'de-DE' : 'en-US';
    return date.toLocaleTimeString(locale, options);
  };

  // Helper to format date strings for events
  const formatEventDate = (dateStr: string): string => {
    const dateObj = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const isToday = dateObj.toDateString() === today.toDateString();
    const isTomorrow = dateObj.toDateString() === tomorrow.toDateString();
    
    if (isToday) {
      return t('event.today');
    } else if (isTomorrow) {
      return t('event.tomorrow');
    } else {
      const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      };
      return formatDate(dateObj, options);
    }
  };

  // Helper to format time strings
  const formatEventTime = (timeStr: string): string => {
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const timeObj = new Date();
      timeObj.setHours(hours, minutes, 0, 0);
      
      const options: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: language === 'en'
      };
      
      return formatTime(timeObj, options);
    }
    return timeStr;
  };

  return {
    t,
    language,
    setLanguage,
    formatDate,
    formatTime,
    formatEventDate,
    formatEventTime
  };
}