import { describe, it, expect, vi, beforeEach } from "vitest";
import { withFallback, retry, RetryError } from "../src/index.js";

describe("withFallback()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("returns the primary result on success", async () => {
    const promise = withFallback(
      async () => "primary",
      async () => "fallback"
    );
    await expect(promise).resolves.toBe("primary");
  });

  it("calls fallback when primary throws", async () => {
    const promise = withFallback(
      async () => { throw new Error("fail"); },
      async () => "fallback"
    );
    await expect(promise).resolves.toBe("fallback");
  });

  it("passes the caught error to fallbackFn", async () => {
    const cause = new Error("cause");
    const fallback = vi.fn().mockResolvedValue("recovered");

    const promise = withFallback(
      async () => { throw cause; },
      fallback
    );
    await expect(promise).resolves.toBe("recovered");
    expect(fallback).toHaveBeenCalledWith(cause);
  });

  it("propagates fallback errors if fallback also throws", async () => {
    const fallbackError = new Error("fallback also broke");
    const promise = withFallback(
      async () => { throw new Error("primary"); },
      async () => { throw fallbackError; }
    );
    await expect(promise).rejects.toBe(fallbackError);
  });

  it("composes with retry — falls back after retries exhausted", async () => {
    const alwaysFails = vi.fn().mockRejectedValue(new Error("nope"));
    const fallback = vi.fn().mockResolvedValue("cache hit");

    const promise = withFallback(
      () => retry(alwaysFails, { retries: 2, baseDelayMs: 10, jitter: false }),
      fallback
    );
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("cache hit");
    expect(alwaysFails).toHaveBeenCalledTimes(3);
    expect(fallback).toHaveBeenCalledWith(expect.any(RetryError));
  });
});

