import { lazy } from "react";
import { isChunkLoadError, recoverFromChunkError } from "./chunkRecovery";

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const lazyWithRetry = (importer, scope, options = {}) => {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 300;

  return lazy(async () => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await importer();
      } catch (error) {
        lastError = error;
        if (!isChunkLoadError(error) || attempt === retries) break;
        await wait(baseDelayMs * 2 ** attempt);
      }
    }
    recoverFromChunkError({ error: lastError, scope, reload: true });
    throw lastError;
  });
};
