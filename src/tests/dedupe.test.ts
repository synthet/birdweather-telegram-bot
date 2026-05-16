import { describe, expect, it } from 'vitest';
import { migrate } from '../db/schema.js';
import { dedupe } from '../subscriptions/dedupe.js';

describe('dedupe',()=>{
  it('marks and checks',()=>{
    migrate();
    dedupe.mark(1,'st','d1');
    expect(dedupe.seen(1,'d1')).toBe(true);
  });
});
