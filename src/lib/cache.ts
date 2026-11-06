// Simple in-memory cache with TTL for Next.js API routes
// Prevents slamming NeonDB with repetitive identical queries

type CacheEntry<T> = {
  data: T;
  expiry: number;
};

const store = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlSeconds: number): void {
  store.set(key, {
    data,
    expiry: Date.now() + ttlSeconds * 1000,
  });
}

export function invalidateCache(keyPrefix: string): void {
  store.forEach((_entry, key) => {
    if (key.startsWith(keyPrefix)) {
      store.delete(key);
    }
  });
}

export function clearAllCache(): void {
  store.clear();
}
