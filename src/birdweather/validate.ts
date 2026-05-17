import { inferStationIdFromToken, validateStationToken } from './rest.js';
import { parseStationId } from '../utils/stationId.js';

export interface RegistrationValidation {
  ok: boolean;
  message: string;
  stationName?: string;
}

export async function validateRegistration(
  stationToken: string,
  stationIdInput: string,
): Promise<RegistrationValidation> {
  const stationId = parseStationId(stationIdInput);
  if (!stationId) {
    return {
      ok: false,
      message: 'Could not read a station ID. Send a numeric ID (e.g. 26807) or your BirdWeather station URL.',
    };
  }

  const tokenOk = await validateStationToken(stationToken);
  if (!tokenOk) {
    return { ok: false, message: 'That station token was rejected. Check the value from your PUC or station settings.' };
  }

  const inferredId = await inferStationIdFromToken(stationToken);
  if (inferredId && inferredId !== stationId) {
    return {
      ok: false,
      message: `Station ID does not match this token. The token belongs to station ${inferredId}.`,
    };
  }

  return {
    ok: true,
    message: inferredId
      ? 'Registration complete.'
      : 'Registration complete. (Station ID could not be cross-checked — no detections yet.)',
  };
}
