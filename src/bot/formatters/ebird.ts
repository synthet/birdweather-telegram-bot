import type { EbirdObservation } from '../../ebird/types.js';

export function formatEbirdObservation(obs: EbirdObservation): string {
  const count = obs.howMany != null ? ` ×${obs.howMany}` : '';
  return `${obs.comName} (${obs.sciName})${count}\n${obs.locName}\n${obs.obsDt}`;
}

export function formatEbirdObservationList(
  observations: EbirdObservation[],
  emptyMessage: string,
): string {
  if (!observations.length) return emptyMessage;
  return observations.map(formatEbirdObservation).join('\n\n');
}
