export const formatIso = (iso?: string | null): string => (iso ? new Date(iso).toLocaleString() : 'N/A');

export function formatDetectionTime(iso?: string | null): string {
  if (!iso) return 'Time unknown';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
