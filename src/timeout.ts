import type { TimeoutOptions } from "./types.js";
import { TimeoutError } from "./errors.js";

/**
 * Wraps an async function with a hard time limit. If `fn` does not resolve
 * within `ms` milliseconds, the returned promise rejects with a
 * {@link TimeoutError}.
 *
 * > **Note:** JavaScript has no true async cancellation. The underlying
 * > promise continues running; only the result is discarded.
 *
 * @param fn      - The async function to execute.
 * @param ms      - Maximum allowed time in milliseconds.
 * @param options - Optional timeout configuration.
 * @returns The resolved value of `fn` if it finishes in time.
 * @throws {TimeoutError} if the deadline is exceeded.
 *
 * @example
 * ```ts
 * import { timeout } from "retrykit";
 *
 * const result = await timeout(() => slowOperation(), 5_000);
 * ```
 */
export async function timeout<T>(
  fn: () => Promise<T>,
  ms: number,
  options: TimeoutOptions = {}
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const { message } = options;
      if (typeof message === "function") {
        reject(message());
      } else {
        reject(new TimeoutError(message));
      }
    }, ms);

    fn()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

