const DETECTION_TIME_LOCALE = 'en-US';

const detectionTimeFormatOptions: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
};

function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(DETECTION_TIME_LOCALE, { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export const formatIso = (iso?: string | null): string => (iso ? new Date(iso).toLocaleString() : 'N/A');

/** Formats a detection instant in the station IANA timezone (falls back to UTC). */
export function formatDetectionTime(
  iso?: string | null,
  timeZone?: string | null,
): string {
  if (!iso) return 'Time unknown';

  const instant = new Date(iso);
  const zone =
    timeZone && isValidTimeZone(timeZone) ? timeZone : 'UTC';

  return new Intl.DateTimeFormat(DETECTION_TIME_LOCALE, {
    ...detectionTimeFormatOptions,
    timeZone: zone,
  }).format(instant);
}
