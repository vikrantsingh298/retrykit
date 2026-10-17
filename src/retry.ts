import type { RetryOptions } from "./types.js";
import { RetryError } from "./errors.js";

/** @internal */
function computeDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  factor: number,
  jitter: boolean
): number {
  const exponential = baseDelayMs * Math.pow(factor, attempt - 1);
  const jitterAmount = jitter ? Math.random() * baseDelayMs : 0;
  return Math.min(exponential + jitterAmount, maxDelayMs);
}

/** @internal */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls `fn` and automatically retries it on failure using exponential
 * back-off with optional jitter.
 *
 * @param fn     - The async function to call. Receives the current attempt
 *                 number (1-based).
 * @param options - Retry configuration.
 * @returns The resolved value of `fn` on any successful attempt.
 * @throws {RetryError} when all attempts are exhausted.
 *
 * @example
 * ```ts
 * import { retry } from "retrykit";
 *
 * const data = await retry(() => fetch("https://api.example.com/data"), {
 *   retries: 4,
 *   baseDelayMs: 500,
 * });
 * ```
 */
export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 300,
    maxDelayMs = 30_000,
    factor = 2,
    jitter = true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      if (attempt <= retries) {
        onRetry?.(attempt, error);
        const delay = computeDelay(attempt, baseDelayMs, maxDelayMs, factor, jitter);
        await sleep(delay);
      }
    }
  }

  throw new RetryError(lastError, retries + 1);
}

