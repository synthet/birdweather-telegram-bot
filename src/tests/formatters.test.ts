import { describe, expect, it } from 'vitest';
import { formatDetection } from '../bot/formatters/detections.js';

describe('formatDetection',()=>{
  it('formats detection',()=>{
    const msg = formatDetection({id:'1', species:{commonName:'Robin', scientificName:'Turdus migratorius'}, score:0.9});
    expect(msg).toContain('Robin');
    expect(msg).toContain('Score: 0.9');
  });
});
