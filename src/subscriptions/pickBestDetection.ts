import type { Detection } from '../birdweather/types.js';

function isBetterDetection(candidate: Detection, current: Detection): boolean {
  const scoreC = candidate.score ?? 0;
  const scoreCur = current.score ?? 0;
  if (scoreC !== scoreCur) return scoreC > scoreCur;

  const confC = candidate.confidence ?? 0;
  const confCur = current.confidence ?? 0;
  if (confC !== confCur) return confC > confCur;

  const probC = candidate.probability ?? 0;
  const probCur = current.probability ?? 0;
  if (probC !== probCur) return probC > probCur;

  const atC = candidate.detectedAt ?? '';
  const atCur = current.detectedAt ?? '';
  return atC > atCur;
}

export function pickBestDetection(detections: Detection[]): Detection {
  let best = detections[0];
  for (let i = 1; i < detections.length; i++) {
    if (isBetterDetection(detections[i], best)) best = detections[i];
  }
  return best;
}
