import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { timeout, TimeoutError } from "../src/index.js";

describe("timeout()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves if fn finishes before deadline", async () => {
    const fn = vi.fn().mockResolvedValue("fast");
    const promise = timeout(fn, 1000);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("fast");
  });

  it("rejects with TimeoutError if deadline is exceeded", async () => {
    const fn = vi.fn().mockImplementation(
      () => new Promise<never>(() => {}) // never resolves
    );
    const promise = timeout(fn, 500);
    const caught = promise.catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    const err = await caught;
    expect(err).toBeInstanceOf(TimeoutError);
  });

  it("propagates the fn's own rejection (not TimeoutError)", async () => {
    const boom = new Error("boom");
    const fn = vi.fn().mockRejectedValue(boom);
    const promise = timeout(fn, 5000);
    const caught = promise.catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    const err = await caught;
    expect(err).toBe(boom);
  });

  it("uses custom string message for TimeoutError", async () => {
    const fn = vi.fn().mockImplementation(() => new Promise<never>(() => {}));
    const promise = timeout(fn, 100, { message: "custom timeout" });
    const caught = promise.catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    const err = await caught;
    expect(err).toBeInstanceOf(TimeoutError);
    expect((err as TimeoutError).message).toBe("custom timeout");
  });

  it("uses custom error factory for TimeoutError", async () => {
    class CustomError extends Error {}
    const fn = vi.fn().mockImplementation(() => new Promise<never>(() => {}));
    const promise = timeout(fn, 100, { message: () => new CustomError("factory") });
    const caught = promise.catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    const err = await caught;
    expect(err).toBeInstanceOf(CustomError);
  });
});

