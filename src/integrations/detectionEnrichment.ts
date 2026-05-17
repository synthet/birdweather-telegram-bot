import type { Detection } from '../birdweather/types.js';
import { enrichSpecies } from '../ebird/enrich.js';
import { isEbirdEnabled } from '../ebird/config.js';
import { rarityHint } from '../ebird/rarity.js';

export async function enrichDetection(
  detection: Detection,
  options: { stationId: string; chatId?: number; includeRarity?: boolean },
): Promise<Detection> {
  const species = await enrichSpecies(detection.species);
  let rarityNote: string | undefined;

  if (options.includeRarity !== false && isEbirdEnabled()) {
    const hint = await rarityHint(
      options.stationId,
      species.scientificName,
      options.chatId,
    );
    if (hint) rarityNote = hint;
  }

  return {
    ...detection,
    species,
    ...(rarityNote ? { rarityNote } : {}),
  };
}

export async function enrichDetections(
  detections: Detection[],
  options: { stationId: string; chatId?: number; includeRarity?: boolean },
): Promise<Detection[]> {
  return Promise.all(detections.map((d) => enrichDetection(d, options)));
}
