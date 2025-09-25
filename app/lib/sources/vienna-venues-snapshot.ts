import fs from 'fs';
import path from 'path';
import { HotCity } from '@/lib/types';

// Optionaler Snapshot: nur wenn HOT_CITY_AUTO_SNAPSHOT=1 gesetzt.
// In Serverless Deployments (Vercel) persistiert das nicht dauerhaft – primär lokaler Dev-Nutzen.
export function snapshotHotCities(hotCities: HotCity[]) {
  if (process.env.HOT_CITY_AUTO_SNAPSHOT !== '1') return;
  try {
    const dir = path.join(process.cwd(), 'data', 'hotCities', 'seed');
    fs.mkdirSync(dir, { recursive: true });
    const latest = path.join(dir, 'hotCities.latest.json');
    fs.writeFileSync(latest, JSON.stringify(hotCities, null, 2), 'utf-8');
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    fs.writeFileSync(
      path.join(dir, `hotCities.${stamp}.json`),
      JSON.stringify(hotCities, null, 2),
      'utf-8'
    );
    console.log('[HOT-CITIES:SNAPSHOT]', { latest });
  } catch (e: any) {
    console.warn('Hot Cities snapshot failed:', e?.message || e);
  }
}