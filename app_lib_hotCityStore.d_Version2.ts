import { HotCityVenue } from '@/lib/types';

export interface HotCityRecord {
  city: string;
  country?: string;
  websites: any[];
  venues?: HotCityVenue[];
  createdAt: Date;
  updatedAt: Date;
}