import type { Species } from '../../birdweather/types.js';
export const formatSpecies = (s: Species): string => `🐦 ${s.commonName} (${s.scientificName})${s.birdweatherUrl ? `\nBirdWeather: ${s.birdweatherUrl}`:''}${s.ebirdUrl ? `\neBird: ${s.ebirdUrl}`:''}${s.macaulayUrl ? `\nMacaulay: ${s.macaulayUrl}`:''}${s.wikipediaUrl ? `\nWikipedia: ${s.wikipediaUrl}`:''}`;
