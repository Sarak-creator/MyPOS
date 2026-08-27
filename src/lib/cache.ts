// Shared in-memory cache manager for POS, Products, and Dashboard Stats

const cacheStore = new Map<string, { data: any; expiresAt: number }>();

export const CacheManager = {
  get(key: string) {
    const item = cacheStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      cacheStore.delete(key);
      return null;
    }
    return item.data;
  },

  set(key: string, data: any, ttlMs: number = 15000) {
    cacheStore.set(key, { data, expiresAt: Date.now() + ttlMs });
  },

  invalidatePrefix(prefix: string) {
    Array.from(cacheStore.keys()).forEach((key) => {
      if (key.startsWith(prefix) || key.includes(prefix)) {
        cacheStore.delete(key);
      }
    });
  },

  invalidateAll() {
    cacheStore.clear();
  },
};
