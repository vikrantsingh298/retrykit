/**
 * Calls `fn` and, if it throws or rejects on every attempt, calls
 * `fallbackFn` instead of propagating the error.
 *
 * This is intentionally composable with {@link retry}:
 *
 * ```ts
 * const result = await withFallback(
 *   () => retry(fetchFromPrimary, { retries: 3 }),
 *   () => fetchFromCache()
 * );
 * ```
 *
 * @param fn         - The primary async function to attempt.
 * @param fallbackFn - Called with the caught error if `fn` fails.
 * @returns The result of `fn` on success, or the result of `fallbackFn`.
 *
 * @example
 * ```ts
 * import { withFallback } from "retrykit";
 *
 * const user = await withFallback(
 *   () => db.getUser(id),
 *   () => ({ id, name: "Guest" })
 * );
 * ```
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallbackFn: (error: unknown) => T | Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    return fallbackFn(error);
  }
}

