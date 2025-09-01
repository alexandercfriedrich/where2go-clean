'use client';

import { useState, useEffect } from 'react';
import { getTranslation, type SupportedLanguage, type Translations } from './i18n';

// Browser language detection - only call on client side
function getBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'de';
  
  try {
    const language = navigator.language || 'de';
    const langCode = language.split('-')[0] as SupportedLanguage;
    
    // Return supported language or fallback to German
    return ['de', 'en'].includes(langCode) ? langCode : 'de';
  } catch {
    return 'de';
  }
}

export function useTranslation() {
  const [language, setLanguage] = useState<SupportedLanguage>('de');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const detectedLanguage = getBrowserLanguage();
    setLanguage(detectedLanguage);
  }, []);

  const t = (key: keyof Translations): string => {
    return getTranslation(language, key);
  };

  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    const locale = language === 'en' ? 'en-US' : 'de-DE';
    try {
      return date.toLocaleDateString(locale, options);
    } catch {
      return date.toLocaleDateString('de-DE', options);
    }
  };

  const formatTime = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    const locale = language === 'en' ? 'en-US' : 'de-DE';
    try {
      return date.toLocaleTimeString(locale, options);
    } catch {
      return date.toLocaleTimeString('de-DE', options);
    }
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
    formatEventTime,
    isClient
  };
}