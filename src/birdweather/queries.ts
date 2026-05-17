import { gql } from 'graphql-request';

export const STATION_QUERY = gql`
  query Station($id: ID!) {
    station(id: $id) {
      id
      name
      type
      location
      locationPrivacy
      country
      state
      coords {
        lat
        lon
      }
      timezone
      latestDetectionAt
      audioUrl
      videoUrl
      counts {
        detections
        species
      }
    }
  }
`;

export const STATIONS_QUERY = gql`
  query Stations($query: String!, $first: Int!) {
    stations(query: $query, first: $first) {
      nodes {
        id
        name
        type
        location
        latestDetectionAt
      }
    }
  }
`;

export const DETECTIONS_QUERY = gql`
  query Detections(
    $stationIds: [ID!]
    $first: Int
    $scoreGte: Float
    $confidenceGte: Float
    $probabilityGte: Float
    $validSoundscape: Boolean
  ) {
    detections(
      stationIds: $stationIds
      first: $first
      scoreGte: $scoreGte
      confidenceGte: $confidenceGte
      probabilityGte: $probabilityGte
      validSoundscape: $validSoundscape
    ) {
      nodes {
        id
        timestamp
        score
        confidence
        probability
        soundscape {
          url
        }
        species {
          commonName
          scientificName
          birdweatherUrl
          ebirdUrl
          wikipediaUrl
        }
        station {
          id
          name
        }
      }
    }
  }
`;

export const SEARCH_SPECIES_QUERY = gql`
  query SearchSpecies($query: String!) {
    searchSpecies(query: $query, first: 10) {
      nodes {
        id
        commonName
        scientificName
        birdweatherUrl
        ebirdUrl
        wikipediaUrl
      }
    }
  }
`;

export const TOP_SPECIES_QUERY = gql`
  query TopSpecies($stationIds: [ID!], $limit: Int) {
    topSpecies(stationIds: $stationIds, limit: $limit) {
      count
      species {
        commonName
        scientificName
      }
    }
  }
`;
