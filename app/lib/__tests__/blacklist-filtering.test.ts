import { describe, it, expect } from 'vitest';
import { filterBlacklistedUrls } from '../hotCityStore';
import { HotCity } from '../types';

describe('Blacklist URL Filtering', () => {
  it('should filter out Wien.gv.at URLs from city websites', () => {
    const testCities: HotCity[] = [
      {
        id: 'test-city-1',
        name: 'Wien',
        country: 'Austria',
        isActive: true,
        websites: [
          {
            id: 'site-1',
            name: 'Wien.gv.at Events',
            url: 'https://www.wien.gv.at/kultur/abteilung/veranstaltungen/',
            categories: [],
            description: 'Should be filtered out',
            priority: 10,
            isActive: true
          },
          {
            id: 'site-2', 
            name: 'Wien.gv.at VADB RSS',
            url: 'https://www.wien.gv.at/vadb/internet/AdvPrSrv.asp',
            categories: [],
            description: 'Should be filtered out',
            priority: 10,
            isActive: true
          },
          {
            id: 'site-3',
            name: 'Wiener Staatsoper',
            url: 'https://www.wiener-staatsoper.at',
            categories: ['Live-Konzerte'],
            description: 'Should remain',
            priority: 9,
            isActive: true
          }
        ],
        venues: [],
        defaultSearchQuery: '',
        customPrompt: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const filtered = filterBlacklistedUrls(testCities);

    expect(filtered[0].websites).toHaveLength(1);
    expect(filtered[0].websites[0].name).toBe('Wiener Staatsoper');
    expect(filtered[0].websites[0].url).toBe('https://www.wiener-staatsoper.at');
  });

  it('should handle different URL formats (case, protocol, trailing slash)', () => {
    const testCities: HotCity[] = [
      {
        id: 'test-city-2',
        name: 'Wien',
        country: 'Austria',
        isActive: true,
        websites: [
          {
            id: 'site-1',
            name: 'Wien.gv.at Events - HTTP',
            url: 'http://www.wien.gv.at/kultur/abteilung/veranstaltungen',
            categories: [],
            description: 'Should be filtered out (different protocol, no trailing slash)',
            priority: 10,
            isActive: true
          },
          {
            id: 'site-2', 
            name: 'Wien.gv.at VADB - Uppercase',
            url: 'HTTPS://WWW.WIEN.GV.AT/VADB/INTERNET/ADVPRSRV.ASP/',
            categories: [],
            description: 'Should be filtered out (uppercase, trailing slash)',
            priority: 10,
            isActive: true
          },
          {
            id: 'site-3',
            name: 'Valid Website',
            url: 'https://example.com',
            categories: [],
            description: 'Should remain',
            priority: 9,
            isActive: true
          }
        ],
        venues: [],
        defaultSearchQuery: '',
        customPrompt: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const filtered = filterBlacklistedUrls(testCities);

    expect(filtered[0].websites).toHaveLength(1);
    expect(filtered[0].websites[0].name).toBe('Valid Website');
  });

  it('should not filter non-blacklisted Wien websites', () => {
    const testCities: HotCity[] = [
      {
        id: 'test-city-3',
        name: 'Wien',
        country: 'Austria',
        isActive: true,
        websites: [
          {
            id: 'site-1',
            name: 'Vienna.info',
            url: 'https://www.vienna.info',
            categories: [],
            description: 'Should remain (different domain)',
            priority: 10,
            isActive: true
          },
          {
            id: 'site-2',
            name: 'Wien Museum',
            url: 'https://www.wienmuseum.at',
            categories: ['Museen'],
            description: 'Should remain (different domain)',
            priority: 9,
            isActive: true
          }
        ],
        venues: [],
        defaultSearchQuery: '',
        customPrompt: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const filtered = filterBlacklistedUrls(testCities);

    expect(filtered[0].websites).toHaveLength(2);
    expect(filtered[0].websites.map(w => w.name)).toContain('Vienna.info');
    expect(filtered[0].websites.map(w => w.name)).toContain('Wien Museum');
  });
});