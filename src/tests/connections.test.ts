import { describe, expect, it } from 'vitest';
import { connectionNodes } from '../birdweather/connections.js';

describe('connectionNodes', () => {
  it('reads nodes from a connection', () => {
    expect(connectionNodes({ nodes: [{ id: '1' }] })).toEqual([{ id: '1' }]);
  });

  it('falls back to edges', () => {
    expect(connectionNodes({ edges: [{ node: { id: '2' } }] })).toEqual([{ id: '2' }]);
  });
});
