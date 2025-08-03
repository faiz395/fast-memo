// Core memoization logic for memoize-cache
// Supports async/sync functions, TTL, custom keygen, manual cache control, and robust error handling

export interface MemoizeOptions<Args extends any[] = any[], Result = any> {
  ttl?: number; // ms, default: 5 min
  keyGenerator?: (...args: Args) => string;
  cacheErrors?: boolean;
  errorTTL?: number; // ms, only used if cacheErrors is true
}

interface CacheEntry<Result> {
  value: Result | Promise<Result>;
  expiresAt: number;
  isError?: boolean;
}

export interface MemoizedFunction<Args extends any[] = any[], Result = any> {
  (...args: Args): Result | Promise<Result>;
  clear: (key?: any[] | null) => void;
  stats: () => { size: number; keys: string[] };
  cache: Map<string, CacheEntry<Result>>;
}

const defaultKeyGen = (...args: any[]) => {
  try {
    return JSON.stringify(args);
  } catch {
    // fallback for non-serializable args
    return args.map(String).join('|');
  }
};

export function memoize<Args extends any[], Result>(
  fn: (...args: Args) => Result | Promise<Result>,
  options: MemoizeOptions<Args, Result> = {}
): MemoizedFunction<Args, Result> {
  const {
    ttl = 5 * 60 * 1000, // 5 min default
    keyGenerator = defaultKeyGen,
    cacheErrors = false,
    errorTTL = 30 * 1000, // 30s for errors
  } = options;
  const cache = new Map<string, CacheEntry<Result>>();

  function purgeIfExpired(key: string, entry: CacheEntry<Result>) {
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return true;
    }
    return false;
  }

  const memoized = function (...args: Args): Result | Promise<Result> {
    const key = keyGenerator(...args);
    const cached = cache.get(key);
    if (cached && !purgeIfExpired(key, cached)) {
      if (cached.isError) throw cached.value;
      return cached.value;
    }
    let result: Result | Promise<Result>;
    let isAsync = false;
    try {
      result = fn(...args);
      isAsync = result instanceof Promise;
    } catch (err) {
      if (cacheErrors) {
        cache.set(key, {
          value: err as any,
          expiresAt: Date.now() + errorTTL,
          isError: true,
        });
      }
      throw err;
    }
    if (!isAsync) {
      cache.set(key, {
        value: result,
        expiresAt: Date.now() + ttl,
      });
      return result;
    }
    // Async: deduplicate concurrent calls
    const promise = (result as Promise<Result>)
      .then((val) => {
        cache.set(key, {
          value: val,
          expiresAt: Date.now() + ttl,
        });
        return val;
      })
      .catch((err) => {
        if (cacheErrors) {
          cache.set(key, {
            value: err as any,
            expiresAt: Date.now() + errorTTL,
            isError: true,
          });
        } else {
          cache.delete(key);
        }
        throw err;
      });
    cache.set(key, {
      value: promise,
      expiresAt: Date.now() + ttl,
    });
    return promise;
  };

  // Manual cache control
  (memoized as MemoizedFunction<Args, Result>).clear = (key?: any[] | null) => {
    if (!key) {
      cache.clear();
    } else {
      // Cast key as Args to satisfy type constraint
      const cacheKey = keyGenerator(...(key as Args));
      cache.delete(cacheKey);
    }
  };
  (memoized as MemoizedFunction<Args, Result>).stats = () => ({
    size: cache.size,
    keys: Array.from(cache.keys()),
  });
  (memoized as MemoizedFunction<Args, Result>).cache = cache;

  return memoized as MemoizedFunction<Args, Result>;
}