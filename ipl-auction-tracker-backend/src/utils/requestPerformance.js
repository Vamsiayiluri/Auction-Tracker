import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";

const storage = new AsyncLocalStorage();
const transactionIds = new WeakMap();
let nextTransactionId = 1;

const isDevelopment = () => process.env.NODE_ENV !== "production";

const trackedEndpoints = [
  ["POST", /\/auction\/bid$/i, "Place Bid"],
  ["POST", /\/auction\/participants\/[^/]+\/sell$/i, "Sell Participant"],
  ["POST", /\/auction\/participants\/[^/]+\/unsold$/i, "Mark Unsold"],
  ["PATCH", /\/auction-config$/i, "Update Budgets"],
  ["PUT", /\/budgets$/i, "Update Budgets"],
  ["POST", /\/pool\/generate$/i, "Generate Pool"],
];

const endpointLabel = (req) => {
  const url = req.originalUrl || req.url || "";
  const match = trackedEndpoints.find(
    ([method, pattern]) => req.method === method && pattern.test(url)
  );
  return match?.[2] || null;
};

const getTransactionKey = (transaction) => {
  if (!transaction) return "no-transaction";
  if (!transactionIds.has(transaction)) {
    transactionIds.set(transaction, nextTransactionId);
    nextTransactionId += 1;
  }
  return `tx-${transactionIds.get(transaction)}`;
};

export const requestPerformanceMiddleware = (req, res, next) => {
  const label = endpointLabel(req);
  const context = {
    cache: new Map(),
    counters: new Map(),
    endpoint: label,
    method: req.method,
    path: req.originalUrl || req.url,
    queries: [],
    startedAt: performance.now(),
  };

  storage.run(context, () => {
    if (isDevelopment() && label) {
      res.on("finish", () => {
        const totalDurationMs = performance.now() - context.startedAt;
        const queryCount = context.queries.length;
        const totalQueryMs = context.queries.reduce(
          (total, query) => total + query.durationMs,
          0
        );
        const slowest = context.queries.reduce(
          (current, query) =>
            !current || query.durationMs > current.durationMs ? query : current,
          null
        );
        console.info("[perf]", {
          endpoint: label,
          method: context.method,
          path: context.path,
          statusCode: res.statusCode,
          totalDurationMs: Number(totalDurationMs.toFixed(2)),
          queryCount,
          slowestQueryMs: slowest
            ? Number(slowest.durationMs.toFixed(2))
            : 0,
          averageQueryMs: queryCount
            ? Number((totalQueryMs / queryCount).toFixed(2))
            : 0,
        });
      });
    }
    next();
  });
};

export const recordQueryTiming = (sql, durationMs = 0) => {
  const context = storage.getStore();
  if (!context || !context.endpoint || !isDevelopment()) return;
  context.queries.push({
    durationMs: Number(durationMs || 0),
    sql: String(sql || "").slice(0, 240),
  });
};

export const getRequestCache = () => storage.getStore()?.cache || null;

export const requestCacheGetOrSet = (key, factory) => {
  const cache = getRequestCache();
  if (!cache) return factory();
  if (!cache.has(key)) {
    cache.set(key, Promise.resolve().then(factory));
  }
  return cache.get(key);
};

export const transactionScopedCacheKey = (scope, id, transaction, extra = "") =>
  `${scope}:${id}:${getTransactionKey(transaction)}:${extra}`;

export const incrementRequestCounter = (name) => {
  const context = storage.getStore();
  if (!context) return 0;
  const nextValue = (context.counters.get(name) || 0) + 1;
  context.counters.set(name, nextValue);
  return nextValue;
};

export const nowMs = () => performance.now();

export const elapsedMs = (startedAt) =>
  Number((performance.now() - startedAt).toFixed(2));

export const payloadSizeBytes = (payload) =>
  Buffer.byteLength(JSON.stringify(payload), "utf8");

export const logBidLatencyTrace = (details) => {
  console.info("[BID_TRACE]", {
    timestamp: new Date().toISOString(),
    ...details,
  });
};
