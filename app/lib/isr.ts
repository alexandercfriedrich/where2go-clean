// Einfache ISR-Heuristik ohne Analytics:
// - HotCities: kürzere Revalidate-Zeit
// - 'heute' am kürzesten, 'morgen' mittel, 'wochenende'/ISO etwas länger
import { getHotCity } from '@/lib/hotCityStore';

export async function getRevalidateFor(cityName: string, dateToken: string): Promise<number> {
  const baseForDate =
    dateToken === 'heute' ? 900 : // 15min
    dateToken === 'morgen' ? 1800 : // 30min
    dateToken === 'wochenende' ? 3600 : // 60min
    3600; // ISO-Datum: 60min

  const hot = await getHotCity(cityName);
  if (hot) {
    // HotCities etwas schneller
    return Math.max(600, Math.round(baseForDate * 0.75)); // min 10min
  }
  return Math.max(900, baseForDate); // min 15min
}
