export interface EbirdTaxonomyRow {
  taxonCode: string;
  scientificName: string;
  commonName: string;
  category?: string;
}

export interface EbirdRegionReverse {
  result: Array<{ code: string; name: string }>;
}

export interface EbirdObservation {
  speciesCode: string;
  comName: string;
  sciName: string;
  locId: string;
  locName: string;
  obsDt: string;
  howMany?: number;
  lat: number;
  lng: number;
  obsValid: boolean;
  obsReviewed: boolean;
  locationPrivate: boolean;
  subId: string;
}

export interface StationGeoRecord {
  station_id: string;
  lat: number | null;
  lng: number | null;
  location_privacy: number;
  country: string | null;
  state: string | null;
  ebird_region_code: string | null;
  updated_at: string;
}
