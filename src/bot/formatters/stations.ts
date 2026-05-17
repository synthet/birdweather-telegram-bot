import type { Station } from '../../birdweather/types.js';
import { formatIso } from '../../utils/dates.js';
import { stationBirdweatherUrl } from '../../utils/stationId.js';

export const formatStation = (s: Station): string => {
  const url = s.url ?? stationBirdweatherUrl(s.id);
  return `🏠 ${s.name}\nID: ${s.id}\nBirdWeather: ${url}\nType: ${s.stationType ?? 'N/A'}\nLocation: ${s.location ?? 'N/A'}\nTimezone: ${s.timezone ?? 'N/A'}\nLatest detection: ${formatIso(s.latestDetectionAt)}\nDetections: ${s.detectionCount ?? 0}\nSpecies: ${s.speciesCount ?? 0}${s.audioUrl ? `\nAudio: ${s.audioUrl}` : ''}${s.videoUrl ? `\nVideo: ${s.videoUrl}` : ''}`;
};
