/**
 * Calculate backoff delay for retry attempts
 */
export function calculateBackoff(
  attemptNumber: number,
  strategy: 'linear' | 'exponential',
  initialDelayMs: number,
  maxDelayMs: number,
): number {
  let delay: number;

  if (strategy === 'exponential') {
    // Exponential: 1s, 2s, 4s, 8s...
    delay = initialDelayMs * Math.pow(2, attemptNumber - 1);
  } else {
    // Linear: 1s, 2s, 3s, 4s...
    delay = initialDelayMs * attemptNumber;
  }

  return Math.min(delay, maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
