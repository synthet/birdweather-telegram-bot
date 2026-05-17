import { describe, expect, it } from 'vitest';
import { formatDetectionTime, parseSqliteTimestamp, stationCalendarDay } from '../utils/dates.js';

describe('formatDetectionTime', () => {
  it('formats in station timezone with abbreviation', () => {
    const formatted = formatDetectionTime(
      '2026-05-16T21:53:58-05:00',
      'America/Chicago',
    );
    expect(formatted).toMatch(/May 16, 2026/);
    expect(formatted).toMatch(/9:53/);
    expect(formatted).toMatch(/CDT|CST/);
    expect(formatted).not.toMatch(/May 17/);
  });

  it('returns YYYY-MM-DD for station calendar day', () => {
    expect(stationCalendarDay('America/Chicago', new Date('2026-05-17T06:00:00Z'))).toBe(
      '2026-05-17',
    );
  });

  it('parses SQLite timestamps and preserves ISO offsets', () => {
    expect(parseSqliteTimestamp('2026-05-17 12:00:00').toISOString()).toBe(
      '2026-05-17T12:00:00.000Z',
    );
    expect(parseSqliteTimestamp('2026-05-17T12:00:00-05:00').toISOString()).toBe(
      '2026-05-17T17:00:00.000Z',
    );
  });

  it('falls back to UTC when timezone is missing or invalid', () => {
    const formatted = formatDetectionTime('2026-05-16T21:53:58-05:00', null);
    expect(formatted).toMatch(/May 17, 2026/);
    expect(formatted).toMatch(/2:53/);
    expect(formatted).toMatch(/UTC/);
  });
});
