/**
 * Thrown when all retry attempts have been exhausted.
 */
export class RetryError extends Error {
  /** The last error that caused the final failure. */
  public readonly cause: unknown;
  /** Total number of attempts made (initial + retries). */
  public readonly attempts: number;

  constructor(cause: unknown, attempts: number) {
    const causeMessage =
      cause instanceof Error ? cause.message : String(cause);
    super(`All ${attempts} attempt(s) failed. Last error: ${causeMessage}`);
    this.name = "RetryError";
    this.cause = cause;
    this.attempts = attempts;
    // Maintain proper prototype chain in transpiled ES5 targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an async operation exceeds its configured time limit.
 */
export class TimeoutError extends Error {
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

