export interface Species {
  id?: string;
  commonName: string;
  scientificName: string;
  birdweatherUrl?: string;
  ebirdUrl?: string;
  ebirdSpeciesCode?: string;
  macaulayUrl?: string;
  wikipediaUrl?: string;
}

export interface StationCoords {
  lat: number;
  lon: number;
}

export interface Station {
  id: string;
  name: string;
  stationType?: string;
  location?: string;
  country?: string;
  state?: string;
  coords?: StationCoords;
  locationPrivacy?: boolean;
  timezone?: string;
  latestDetectionAt?: string;
  detectionCount?: number;
  speciesCount?: number;
  audioUrl?: string;
  videoUrl?: string;
  url?: string;
}

export interface Detection {
  id: string;
  detectedAt?: string;
  score?: number;
  confidence?: number;
  probability?: number;
  soundscapeUrl?: string;
  species: Species;
  station?: Pick<Station, 'id' | 'name' | 'timezone'>;
  rarityNote?: string;
}
