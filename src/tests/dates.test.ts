import { describe, expect, it } from 'vitest';
import { formatDetectionTime } from '../utils/dates.js';

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

  it('falls back to UTC when timezone is missing or invalid', () => {
    const formatted = formatDetectionTime('2026-05-16T21:53:58-05:00', null);
    expect(formatted).toMatch(/May 17, 2026/);
    expect(formatted).toMatch(/2:53/);
    expect(formatted).toMatch(/UTC/);
  });
});
