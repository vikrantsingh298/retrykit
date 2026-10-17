import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { retryIf, RetryError } from "../src/index.js";

class NetworkError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "NetworkError";
  }
}

class AuthError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "AuthError";
  }
}

describe("retryIf()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries when predicate returns true", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError("timeout"))
      .mockResolvedValue("ok");

    const promise = retryIf(fn, (e) => e instanceof NetworkError, {
      retries: 2,
      baseDelayMs: 10,
      jitter: false,
    });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry when predicate returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new AuthError("forbidden"));

    const promise = retryIf(fn, (e) => e instanceof NetworkError, {
      retries: 5,
      baseDelayMs: 10,
      jitter: false,
    });
    // Attach catch before running timers
    const caught = promise.catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    const err = await caught;
    expect(err).toBeInstanceOf(AuthError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resolves on first attempt without any retry", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const promise = retryIf(fn, () => true);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws RetryError after exhausting retryable attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new NetworkError("net"));

    const promise = retryIf(fn, (e) => e instanceof NetworkError, {
      retries: 2,
      baseDelayMs: 10,
      jitter: false,
    });
    const caught = promise.catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    const err = await caught;
    expect(err).toBeInstanceOf(RetryError);
  });

  it("supports async predicates", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError("net"))
      .mockResolvedValue("data");

    const predicate = vi.fn().mockResolvedValue(true);
    const promise = retryIf(fn, predicate, { retries: 2, baseDelayMs: 10, jitter: false });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("data");
    expect(predicate).toHaveBeenCalledWith(expect.any(NetworkError));
  });
});

