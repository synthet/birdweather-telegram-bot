import type { Detection } from '../../birdweather/types.js';
import { formatIso } from '../../utils/dates.js';
export const formatDetection = (d: Detection): string =>
  `🐦 ${d.species.commonName}\n${d.species.scientificName}\nTime: ${formatIso(d.detectedAt)}\nScore: ${d.score ?? 'N/A'}\nConfidence: ${d.confidence ?? 'N/A'}\nProbability: ${d.probability ?? 'N/A'}${d.soundscapeUrl ? `\nAudio: ${d.soundscapeUrl}` : ''}${d.species.birdweatherUrl ? `\nBirdWeather: ${d.species.birdweatherUrl}` : ''}${d.species.ebirdUrl ? `\neBird: ${d.species.ebirdUrl}` : ''}${d.species.macaulayUrl ? `\nMacaulay: ${d.species.macaulayUrl}` : ''}${d.rarityNote ? `\n${d.rarityNote}` : ''}`;
