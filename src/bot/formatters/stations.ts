import type { Station } from '../../birdweather/types.js';
import { formatIso } from '../../utils/dates.js';
export const formatStation = (s: Station): string => `🏠 ${s.name}\nID: ${s.id}\nType: ${s.stationType ?? 'N/A'}\nLocation: ${s.location ?? 'N/A'}\nTimezone: ${s.timezone ?? 'N/A'}\nLatest detection: ${formatIso(s.latestDetectionAt)}\nDetections: ${s.detectionCount ?? 0}\nSpecies: ${s.speciesCount ?? 0}${s.url ? `\nBirdWeather: ${s.url}`:''}${s.audioUrl ? `\nAudio: ${s.audioUrl}`:''}${s.videoUrl ? `\nVideo: ${s.videoUrl}`:''}`;
