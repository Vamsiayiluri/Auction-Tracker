const DEFAULT_TTL_MS = 45_000;
const store = new Map();
const inflight = new Map();

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
};

export const stableCacheKey = (...parts) =>
  parts
    .map((part) =>
      typeof part === "string" ? part : JSON.stringify(stableValue(part))
    )
    .join("|");

export const userCacheScope = (user) =>
  stableCacheKey("user", user?.role || "guest", user?.id || user?.userId || user?.email || "current");

export const getCachedValue = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

export const setCachedValue = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
    createdAt: Date.now(),
  });
  return value;
};

export const invalidateCache = (prefix = "") => {
  for (const key of store.keys()) {
    if (!prefix || key.startsWith(prefix)) store.delete(key);
  }
};

export const cachedRequest = async (
  key,
  fetcher,
  { ttlMs = DEFAULT_TTL_MS, force = false } = {}
) => {
  if (!force) {
    const cached = getCachedValue(key);
    if (cached) return cached;
  }
  if (inflight.has(key)) return inflight.get(key);
  const promise = Promise.resolve()
    .then(fetcher)
    .then((value) => setCachedValue(key, value, ttlMs))
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
};

export const refreshCachedRequest = (key, fetcher, options = {}) =>
  cachedRequest(key, fetcher, { ...options, force: true });
