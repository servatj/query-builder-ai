import { describe, it, expect } from 'vitest';
import { setPool, getPool, setDestinationPool, getDestinationPool } from '../../../src/services/pools';

describe('pools service', () => {
  it('sets and gets main pool', () => {
    const p = { id: 1 } as any;
    setPool(p);
    expect(getPool()).toBe(p);
    setPool(null);
    expect(getPool()).toBeNull();
  });

  it('sets and gets destination pool', () => {
    const p = { id: 2 } as any;
    setDestinationPool(p);
    expect(getDestinationPool()).toBe(p);
    setDestinationPool(null);
    expect(getDestinationPool()).toBeNull();
  });
});
