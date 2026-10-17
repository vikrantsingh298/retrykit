# retrykit

> Zero-dependency, TypeScript-first async retry & resilience toolkit.  
> Works on **Node.js**, **Bun**, **Deno**, and **Edge runtimes** (Cloudflare Workers, Vercel Edge).

[![npm version](https://img.shields.io/npm/v/retrykit?color=blue)](https://www.npmjs.com/package/retrykit)
[![bundle size](https://img.shields.io/bundlephobia/minzip/retrykit)](https://bundlephobia.com/package/retrykit)
[![license](https://img.shields.io/npm/l/retrykit)](./LICENSE)

## Why retrykit?

| | retrykit | p-retry | axios-retry |
|---|---|---|---|
| Zero dependencies | ✅ | ❌ | ❌ |
| Edge / Bun / Deno safe | ✅ | ✅ | ❌ |
| TypeScript-first | ✅ | ⚠️ types only | ⚠️ types only |
| Conditional retry (`retryIf`) | ✅ | ⚠️ manual | ❌ |
| Timeout helper | ✅ | ❌ | ❌ |
| Fallback helper | ✅ | ❌ | ❌ |
| ESM + CJS dual build | ✅ | ESM only | CJS only |

## Installation

```sh
npm install retrykit
# or
pnpm add retrykit
# or
bun add retrykit
```

## Quick Start

```ts
import { retry, retryIf, timeout, withFallback } from "retrykit";

// Retry any async function with exponential back-off
const data = await retry(() => fetch("https://api.example.com/data").then(r => r.json()), {
  retries: 4,
  baseDelayMs: 500,
});
```

---

## API

### `retry(fn, options?)`

Calls `fn` and automatically retries it on failure using **exponential back-off with jitter**.

```ts
import { retry } from "retrykit";

const result = await retry(
  async (attempt) => {
    console.log(`Attempt ${attempt}`);
    return await fetchData();
  },
  {
    retries: 3,       // max retry attempts (default: 3)
    baseDelayMs: 300, // starting delay in ms (default: 300)
    maxDelayMs: 30_000, // delay cap (default: 30_000)
    factor: 2,        // exponential factor (default: 2)
    jitter: true,     // randomize delay (default: true)
    onRetry: (attempt, error) => {
      console.warn(`Retrying after attempt ${attempt}:`, error);
    },
  }
);
```

**Delay formula:** `min(baseDelayMs × factor^(attempt-1) + jitter, maxDelayMs)`

Throws [`RetryError`](#retryerror) when all attempts are exhausted.

---

### `retryIf(fn, predicate, options?)`

Like `retry`, but **only retries when the predicate returns `true`** for the thrown error. Non-matching errors are re-thrown immediately.

```ts
import { retryIf } from "retrykit";

const result = await retryIf(
  () => fetchData(),
  (error) => error instanceof NetworkError, // only retry network errors
  { retries: 5, baseDelayMs: 200 }
);
```

Async predicates are supported:

```ts
const result = await retryIf(
  () => processJob(id),
  async (error) => {
    const isTransient = await checkIfTransient(error);
    return isTransient;
  }
);
```

---

### `timeout(fn, ms, options?)`

Wraps an async function with a **hard time limit**. Rejects with [`TimeoutError`](#timeouterror) if the deadline is exceeded.

```ts
import { timeout } from "retrykit";

// Simple timeout
const result = await timeout(() => slowOperation(), 5_000);

// Custom error message
const result = await timeout(() => slowOperation(), 5_000, {
  message: "slowOperation timed out after 5s",
});

// Custom error factory
const result = await timeout(() => slowOperation(), 5_000, {
  message: () => new MyCustomError("deadline exceeded"),
});
```

> **Note:** JavaScript has no true async cancellation. The underlying promise keeps running; only the result is discarded.

---

### `withFallback(fn, fallbackFn)`

Returns the result of `fallbackFn` when `fn` throws, receiving the caught error.

```ts
import { withFallback } from "retrykit";

const user = await withFallback(
  () => db.getUser(id),
  () => ({ id, name: "Guest" }) // static or async fallback
);
```

**Compose with `retry` for production-grade resilience:**

```ts
const data = await withFallback(
  () => retry(fetchFromPrimary, { retries: 3 }),
  (error) => {
    console.error("Primary failed after retries, using cache:", error);
    return fetchFromCache();
  }
);
```

---

### Error Classes

#### `RetryError`

Thrown by `retry()` when all attempts are exhausted.

```ts
import { RetryError } from "retrykit";

try {
  await retry(fn, { retries: 3 });
} catch (err) {
  if (err instanceof RetryError) {
    console.error(`Failed after ${err.attempts} attempts`);
    console.error("Root cause:", err.cause);
  }
}
```

| Property | Type | Description |
|---|---|---|
| `cause` | `unknown` | The last error that caused the failure |
| `attempts` | `number` | Total attempts made (initial + retries) |

#### `TimeoutError`

Thrown by `timeout()` when the deadline is exceeded.

```ts
import { TimeoutError } from "retrykit";

try {
  await timeout(fn, 1000);
} catch (err) {
  if (err instanceof TimeoutError) {
    console.error("Timed out!");
  }
}
```

---

## Recipes

### Retry + Timeout together

```ts
import { retry, timeout } from "retrykit";

const result = await retry(
  () => timeout(fetchData, 3_000), // each attempt has a 3s deadline
  { retries: 3, baseDelayMs: 500 }
);
```

### Only retry HTTP 5xx errors

```ts
import { retryIf } from "retrykit";

const result = await retryIf(
  async () => {
    const res = await fetch(url);
    if (!res.ok) throw Object.assign(new Error("HTTP error"), { status: res.status });
    return res.json();
  },
  (err) => typeof (err as any).status === "number" && (err as any).status >= 500,
  { retries: 4 }
);
```

### Retry with circuit-breaker style fallback

```ts
import { retry, withFallback } from "retrykit";

const data = await withFallback(
  () => retry(fetchFromAPI, { retries: 3, baseDelayMs: 1_000 }),
  () => getFromCache()
);
```

---

## Options Reference

```ts
interface RetryOptions {
  retries?: number;      // default: 3
  baseDelayMs?: number;  // default: 300
  maxDelayMs?: number;   // default: 30_000
  factor?: number;       // default: 2
  jitter?: boolean;      // default: true
  onRetry?: (attempt: number, error: unknown) => void;
}

interface TimeoutOptions {
  message?: string | (() => Error);
}
```

---

## License

[MIT](./LICENSE)

