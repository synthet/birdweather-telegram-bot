export const NOTIFICATION_FETCH_LIMIT = 5;

export interface DetectionFilterSettings {
  scoreGte: number;
  confidenceGte: number;
  probabilityGte: number;
}

export function detectionFiltersFromRow(row: {
  min_score: number | null;
  min_confidence: number | null;
  min_probability: number | null;
}): DetectionFilterSettings {
  return {
    scoreGte: row.min_score ?? 0,
    confidenceGte: row.min_confidence ?? 0,
    probabilityGte: row.min_probability ?? 0,
  };
}

export function asFilterRecord(settings: DetectionFilterSettings): Record<string, unknown> {
  return {
    scoreGte: settings.scoreGte,
    confidenceGte: settings.confidenceGte,
    probabilityGte: settings.probabilityGte,
  };
}
