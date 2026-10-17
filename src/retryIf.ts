import type { RetryOptions, RetryPredicate } from "./types.js";
import { RetryError } from "./errors.js";

/** @internal - used to signal the retry loop to bail out immediately. */
class NonRetryableError extends Error {
  constructor(public readonly original: unknown) {
    super("Non-retryable error");
    this.name = "NonRetryableError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

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
 * Like {@link retry}, but only retries when `predicate` returns `true` for the
 * thrown error.  Non-matching errors are re-thrown immediately without
 * consuming retry budget.
 *
 * @param fn        - The async function to call.
 * @param predicate - Returns `true` if the error should trigger a retry.
 * @param options   - Retry configuration (same as {@link retry}).
 * @returns The resolved value of `fn` on any successful attempt.
 * @throws The original error when `predicate` returns `false`.
 * @throws {RetryError} when all retry attempts matching the predicate fail.
 *
 * @example
 * ```ts
 * import { retryIf } from "retrykit";
 *
 * const result = await retryIf(
 *   () => fetchData(),
 *   (err) => err instanceof NetworkError,
 *   { retries: 5 }
 * );
 * ```
 */
export async function retryIf<T, E = unknown>(
  fn: (attempt: number) => Promise<T>,
  predicate: RetryPredicate<E>,
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
        const shouldRetry = await predicate(error as E);
        if (!shouldRetry) {
          // Non-retryable: bail immediately with the original error.
          throw error;
        }
        onRetry?.(attempt, error);
        const delay = computeDelay(attempt, baseDelayMs, maxDelayMs, factor, jitter);
        await sleep(delay);
      }
    }
  }

  throw new RetryError(lastError, retries + 1);
}

