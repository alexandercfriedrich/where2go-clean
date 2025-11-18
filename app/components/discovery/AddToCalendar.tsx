/**
 * Add to Calendar Button Component
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { downloadICS, getGoogleCalendarURL, getOutlookCalendarURL, getYahooCalendarURL } from '../../../lib/calendar-utils';

interface AddToCalendarProps {
  event: {
    title: string;
    start_date_time?: string;
    date?: string;
    time?: string;
    end_date_time?: string;
    custom_venue_name?: string;
    venue?: string;
    description?: string;
    id: string;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AddToCalendar({ event, className = '', size = 'md' }: AddToCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse date/time from either start_date_time or separate date/time fields
  const getStartDate = () => {
    if (event.start_date_time) {
      return new Date(event.start_date_time);
    }
    if (event.date) {
      const timeStr = event.time || '19:00';
      return new Date(`${event.date}T${timeStr}:00`);
    }
    return new Date();
  };

  const calendarEvent = {
    title: event.title,
    description: event.description || `Event at ${event.custom_venue_name || event.venue || 'TBA'}`,
    location: event.custom_venue_name || event.venue || '',
    startDate: getStartDate(),
    endDate: event.end_date_time ? new Date(event.end_date_time) : undefined,
    url: typeof window !== 'undefined' ? `${window.location.origin}/event/${event.id}` : undefined,
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleDownloadICS = () => {
    downloadICS(calendarEvent);
    setIsOpen(false);
  };

  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarURL(calendarEvent), '_blank');
    setIsOpen(false);
  };

  const handleOutlookCalendar = () => {
    window.open(getOutlookCalendarURL(calendarEvent), '_blank');
    setIsOpen(false);
  };

  const handleYahooCalendar = () => {
    window.open(getYahooCalendarURL(calendarEvent), '_blank');
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className={`${sizeClasses[size]} rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${className}`}
          aria-label="Add to calendar"
          aria-expanded={isOpen}
          title="Add to calendar"
        >
          <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {isOpen && (
          <div className="fixed inset-0 z-[9999]" onClick={() => setIsOpen(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20" />
            
            {/* Dropdown positioned near the button */}
            <div 
              className="absolute w-56 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              style={{
                top: dropdownRef.current ? `${dropdownRef.current.getBoundingClientRect().bottom + 8}px` : '50%',
                left: dropdownRef.current ? `${dropdownRef.current.getBoundingClientRect().right - 224}px` : '50%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleGoogleCalendar}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                </svg>
                <span className="text-gray-900 dark:text-gray-100">Google Calendar</span>
              </button>

              <button
                onClick={handleOutlookCalendar}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 3a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1h18m-8.5 9.5L13 8l3 3-3 3-.5-1.5H8v-3h4.5z"/>
                </svg>
                <span className="text-gray-900 dark:text-gray-100">Outlook Calendar</span>
              </button>

              <button
                onClick={handleYahooCalendar}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
                <span className="text-gray-900 dark:text-gray-100">Yahoo Calendar</span>
              </button>

              <button
                onClick={handleDownloadICS}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 border-t border-gray-200 dark:border-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-gray-900 dark:text-gray-100">Download ICS</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
