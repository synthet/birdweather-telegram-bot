export const formatIso = (iso?: string | null): string => (iso ? new Date(iso).toLocaleString() : 'N/A');
