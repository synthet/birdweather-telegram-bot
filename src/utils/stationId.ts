export const BIRDWATHER_APP_BASE = 'https://app.birdweather.com';

/** Public station page on BirdWeather (e.g. https://app.birdweather.com/stations/26807). */
export function stationBirdweatherUrl(stationId: string): string {
  return `${BIRDWATHER_APP_BASE}/stations/${encodeURIComponent(stationId)}`;
}

/** Numeric station ID or BirdWeather station URL/path (e.g. …/stations/26807). */
export function parseStationId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;

  const pathMatch = trimmed.match(/\/stations\/(\d+)\/?(?:\?.*)?$/i);
  if (pathMatch) return pathMatch[1];

  try {
    const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    const fromUrl = url.pathname.match(/\/stations\/(\d+)\/?$/i);
    if (fromUrl) return fromUrl[1];
  } catch {
    // not a URL
  }

  return null;
}
