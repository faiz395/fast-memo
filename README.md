# fast-memo

A robust, configurable memoization cache for async and sync functions. Boost performance and reduce redundant computations or API calls with a dead-simple, production-ready caching utility.

---

## Features

- **Works with both async and sync functions**
- **Configurable TTL (time-to-live) for cache entries**
- **Custom cache key generation**
- **Optional error caching with separate TTL**
- **Manual cache clearing (all or by key)**
- **Cache stats and direct cache access**
- **Handles concurrent async calls (deduplication)**
- **TypeScript support**

---

## Installation

```bash
npm install fast-memo
```

---

## Usage

### Basic Example

```js
const { memoize } = require('fast-memo');

// An expensive or async function
async function fetchUser(id) {
  // Simulate API call
  return { id, name: `User ${id}` };
}

// Wrap with memoize
const getCachedUser = memoize(fetchUser);

// Usage
await getCachedUser(1); // Calls fetchUser, caches result
await getCachedUser(1); // Returns cached result instantly
```

### Multiple and Complex Parameters

```js
async function fetchData(userId, options, filters) {
  // ...
}
const getCachedData = memoize(fetchData);
await getCachedData(1, { active: true }, ['role:admin']);
await getCachedData(1, { active: true }, ['role:admin']); // Cached
```

---

## API

### `memoize(fn, options?)`

Wraps a function with memoization logic.

#### **Parameters:**
- `fn`: Function to memoize (sync or async)
- `options` (optional):
  - `ttl` (number): Time-to-live for cache entries in ms (default: 5 minutes)
  - `keyGenerator` (function): Custom function to generate cache key from arguments (default: `JSON.stringify(args)`)
  - `cacheErrors` (boolean): Whether to cache errors (default: `false`)
  - `errorTTL` (number): TTL for cached errors in ms (default: 30 seconds)

#### **Returns:**
A memoized function with extra methods:
- `clear(key?: any[] | null)`: Clear the entire cache or a specific key
- `stats()`: Returns `{ size, keys }` for the cache
- `cache`: Direct access to the underlying `Map`

---

## Advanced Usage

### Custom Cache Key

```js
const getCachedUser = memoize(fetchUser, {
  keyGenerator: (id, options) => `${id}:${options.active}`
});
```

### Configurable TTL

```js
const getCachedUser = memoize(fetchUser, { ttl: 60000 }); // 1 minute
```

### Error Caching

```js
const getCachedUser = memoize(fetchUser, {
  cacheErrors: true,
  errorTTL: 5000 // Cache errors for 5 seconds
});
```

### Manual Cache Control

```js
getCachedUser.clear(); // Clear all cache
getCachedUser.clear([1]); // Clear cache for user 1
console.log(getCachedUser.stats()); // { size: X, keys: [...] }
```

### TypeScript Support

```ts
import { memoize } from 'fast-memo';

async function fetchUser(id: number): Promise<User> { /* ... */ }
const getCachedUser = memoize(fetchUser);
```

---

## How It Works

- Arguments are serialized (by default with `JSON.stringify`) to create a unique cache key for each call.
- If a cached value exists and is not expired, it is returned instantly.
- If not, the original function is called, and the result is cached.
- For async functions, concurrent calls with the same arguments share the same pending promise.
- Errors are not cached by default, but can be cached with a separate TTL if desired.

---

## When to Use

- Expensive computations
- API/database calls
- Functions with predictable/repeated inputs

---

## License

ISC
