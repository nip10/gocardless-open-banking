import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateBackoff, sleep } from '../../../src/utils/backoff';

describe('calculateBackoff', () => {
  describe('linear backoff', () => {
    it('should calculate linear backoff for attempt 1', () => {
      const delay = calculateBackoff(1, 'linear', 1000, 30000);
      expect(delay).toBe(1000);
    });

    it('should calculate linear backoff for attempt 2', () => {
      const delay = calculateBackoff(2, 'linear', 1000, 30000);
      expect(delay).toBe(2000);
    });

    it('should calculate linear backoff for attempt 3', () => {
      const delay = calculateBackoff(3, 'linear', 1000, 30000);
      expect(delay).toBe(3000);
    });

    it('should respect max delay', () => {
      const delay = calculateBackoff(50, 'linear', 1000, 10000);
      expect(delay).toBe(10000);
    });

    it('should handle different initial delays', () => {
      const delay = calculateBackoff(2, 'linear', 500, 30000);
      expect(delay).toBe(1000); // 500 * 2
    });
  });

  describe('exponential backoff', () => {
    it('should calculate exponential backoff for attempt 1', () => {
      const delay = calculateBackoff(1, 'exponential', 1000, 30000);
      expect(delay).toBe(1000); // 1000 * 2^0
    });

    it('should calculate exponential backoff for attempt 2', () => {
      const delay = calculateBackoff(2, 'exponential', 1000, 30000);
      expect(delay).toBe(2000); // 1000 * 2^1
    });

    it('should calculate exponential backoff for attempt 3', () => {
      const delay = calculateBackoff(3, 'exponential', 1000, 30000);
      expect(delay).toBe(4000); // 1000 * 2^2
    });

    it('should calculate exponential backoff for attempt 4', () => {
      const delay = calculateBackoff(4, 'exponential', 1000, 30000);
      expect(delay).toBe(8000); // 1000 * 2^3
    });

    it('should respect max delay', () => {
      const delay = calculateBackoff(10, 'exponential', 1000, 5000);
      expect(delay).toBe(5000); // Would be 512000, capped at 5000
    });

    it('should handle different initial delays', () => {
      const delay = calculateBackoff(2, 'exponential', 500, 30000);
      expect(delay).toBe(1000); // 500 * 2^1
    });
  });

  describe('edge cases', () => {
    it('should handle attempt 0', () => {
      const linearDelay = calculateBackoff(0, 'linear', 1000, 30000);
      expect(linearDelay).toBe(0);

      const exponentialDelay = calculateBackoff(0, 'exponential', 1000, 30000);
      expect(exponentialDelay).toBe(500); // 1000 * 2^-1
    });

    it('should handle very large attempt numbers', () => {
      const delay = calculateBackoff(1000, 'exponential', 1000, 60000);
      expect(delay).toBe(60000); // Capped at max
    });

    it('should handle zero initial delay', () => {
      const delay = calculateBackoff(5, 'linear', 0, 30000);
      expect(delay).toBe(0);
    });

    it('should handle zero max delay', () => {
      const delay = calculateBackoff(5, 'linear', 1000, 0);
      expect(delay).toBe(0);
    });
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should wait for specified milliseconds', async () => {
    const promise = sleep(1000);

    // Fast-forward time
    vi.advanceTimersByTime(1000);

    await expect(promise).resolves.toBeUndefined();
  });

  it('should not resolve before timeout', async () => {
    let resolved = false;
    const promise = sleep(1000).then(() => {
      resolved = true;
    });

    vi.advanceTimersByTime(500);
    await Promise.resolve(); // Flush microtasks

    expect(resolved).toBe(false);

    vi.advanceTimersByTime(500);
    await promise;

    expect(resolved).toBe(true);
  });

  it('should handle zero delay', async () => {
    const promise = sleep(0);
    vi.advanceTimersByTime(0);
    await expect(promise).resolves.toBeUndefined();
  });

  it('should handle multiple concurrent sleeps', async () => {
    const results: number[] = [];

    void sleep(1000).then(() => results.push(1));
    void sleep(500).then(() => results.push(2));
    void sleep(1500).then(() => results.push(3));

    vi.advanceTimersByTime(500);
    await Promise.resolve();
    expect(results).toEqual([2]);

    vi.advanceTimersByTime(500);
    await Promise.resolve();
    expect(results).toEqual([2, 1]);

    vi.advanceTimersByTime(500);
    await Promise.resolve();
    expect(results).toEqual([2, 1, 3]);
  });
});
