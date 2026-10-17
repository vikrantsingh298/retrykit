/**
 * Options for configuring retry behavior.
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts (not counting the initial call).
   * @default 3
   */
  retries?: number;

  /**
   * Base delay in milliseconds between retries.
   * @default 300
   */
  baseDelayMs?: number;

  /**
   * Maximum delay cap in milliseconds (for exponential back-off).
   * @default 30_000
   */
  maxDelayMs?: number;

  /**
   * Back-off factor applied to the delay on each attempt.
   * delay = min(baseDelayMs * factor^attempt + jitter, maxDelayMs)
   * @default 2
   */
  factor?: number;

  /**
   * Whether to apply random jitter to the delay to avoid thundering herd.
   * @default true
   */
  jitter?: boolean;

  /**
   * Called before each retry attempt with the current attempt index (1-based)
   * and the error that caused the retry.
   */
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Options for timeout wrapping.
 */
export interface TimeoutOptions {
  /**
   * Custom error message or error factory used when the timeout fires.
   */
  message?: string | (() => Error);
}

/**
 * A function that decides whether an error should trigger a retry.
 */
export type RetryPredicate<E = unknown> = (error: E) => boolean | Promise<boolean>;

