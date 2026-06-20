const CHUNK_ERROR_PATTERNS = [
  "failed to fetch dynamically imported module",
  "chunkloaderror",
  "loading chunk",
  "expected a javascript module script",
  "expected javascript module",
  "importing a module script failed",
  "module script",
];

const reloadKey = (scope = "global") =>
  `auctionarena:chunk-reload:${scope}:${window.location.pathname}`;

export const isChunkLoadError = (error) => {
  const message = String(
    error?.message || error?.reason?.message || error?.type || error || ""
  ).toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

export const recoverFromChunkError = ({
  error,
  scope = "global",
  reload = true,
} = {}) => {
  if (!isChunkLoadError(error)) return false;
  const key = reloadKey(scope);
  if (sessionStorage.getItem(key) === "1") return false;
  sessionStorage.setItem(key, "1");
  console.warn("[CHUNK_RECOVERY] stale or missing chunk detected", {
    scope,
    message: error?.message || String(error),
  });
  if (reload) {
    window.location.reload();
  }
  return true;
};

export const installVitePreloadRecovery = () => {
  if (typeof window === "undefined" || window.__auctionArenaPreloadRecovery) {
    return;
  }
  window.__auctionArenaPreloadRecovery = true;
  window.addEventListener("vite:preloadError", (event) => {
    console.warn("[CHUNK_RECOVERY] vite preload error", {
      message: event?.payload?.message || event?.message,
    });
    if (recoverFromChunkError({ error: event?.payload || event, scope: "vite" })) {
      event.preventDefault?.();
    }
  });
};
