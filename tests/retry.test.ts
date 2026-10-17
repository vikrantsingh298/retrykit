import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { retry, RetryError } from "../src/index.js";

describe("retry()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves immediately on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(retry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries and succeeds on 3rd attempt", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("success");

    const promise = retry(fn, { retries: 3, baseDelayMs: 100, jitter: false });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws RetryError after exhausting all attempts", async () => {
    const cause = new Error("always fails");
    const fn = vi.fn().mockRejectedValue(cause);

    // Attach .catch before running timers to avoid unhandled rejection
    const promise = retry(fn, { retries: 2, baseDelayMs: 50, jitter: false });
    const caught = promise.catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    const err = await caught;
    expect(err).toBeInstanceOf(RetryError);
    expect((err as RetryError).attempts).toBe(3); // 1 initial + 2 retries
    expect((err as RetryError).cause).toBe(cause);
  });

  it("calls onRetry callback for each retry", async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("e1"))
      .mockRejectedValueOnce(new Error("e2"))
      .mockResolvedValue("done");

    const promise = retry(fn, { retries: 3, baseDelayMs: 10, jitter: false, onRetry });
    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error));
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error));
  });

  it("passes attempt number to fn", async () => {
    const attempts: number[] = [];
    const fn = vi.fn().mockImplementation(async (attempt: number) => {
      attempts.push(attempt);
      if (attempt < 3) throw new Error("not yet");
      return "ready";
    });

    const promise = retry(fn, { retries: 3, baseDelayMs: 10, jitter: false });
    await vi.runAllTimersAsync();
    await promise;

    expect(attempts).toEqual([1, 2, 3]);
  });

  it("respects maxDelayMs cap", async () => {
    const sleepSpy = vi.spyOn(globalThis, "setTimeout");
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("e"))
      .mockResolvedValue("ok");

    const promise = retry(fn, {
      retries: 1,
      baseDelayMs: 99_999,
      maxDelayMs: 500,
      jitter: false,
    });
    await vi.runAllTimersAsync();
    await promise;

    const delays = sleepSpy.mock.calls.map(([, ms]) => ms as number);
    expect(delays.some((d) => d <= 500)).toBe(true);
  });
});

