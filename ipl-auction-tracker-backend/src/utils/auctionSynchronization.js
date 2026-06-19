import {
  elapsedMs,
  logBidLatencyTrace,
  nowMs,
  payloadSizeBytes,
} from "./requestPerformance.js";

const revisions = new Map();

const nextRevision = (scopeType, scopeId) => {
  const key = `${scopeType}:${scopeId}`;
  const timestampRevision = Date.now() * 1000;
  const revision = Math.max(timestampRevision, (revisions.get(key) || 0) + 1);
  revisions.set(key, revision);
  return revision;
};

export const createAuctionSynchronizationService = ({
  io,
  scopeType,
  roomName,
  eventName = "auction-state",
  loadSnapshot,
}) => {
  const buildPayload = async (scopeId, reason) => {
    const revision = nextRevision(scopeType, scopeId);
    const snapshotStartedAt = nowMs();
    const snapshot = await loadSnapshot(scopeId);
    const snapshotMs = elapsedMs(snapshotStartedAt);
    const serverTime = new Date().toISOString();
    const payload = {
      version: 1,
      scopeType,
      scopeId,
      reason,
      revision,
      serverTime,
      deadlineAt: snapshot.state?.current?.endsAt || null,
      ...snapshot,
      state: {
        ...snapshot.state,
        serverTime,
      },
    };
    return { payload, snapshotMs };
  };

  return {
    publish: async (scopeId, reason) => {
      const publishStartedAt = nowMs();
      const traceBidPlacement = reason === "bid-placed";
      const { payload, snapshotMs } = await buildPayload(scopeId, reason);
      let bytes = 0;
      let serializationMs = 0;
      if (traceBidPlacement) {
        const serializeStartedAt = nowMs();
        bytes = payloadSizeBytes(payload);
        serializationMs = elapsedMs(serializeStartedAt);
      }
      const emitStartedAt = traceBidPlacement ? nowMs() : 0;
      io.to(roomName(scopeId)).emit(eventName, payload);
      const broadcastMs = traceBidPlacement ? elapsedMs(emitStartedAt) : 0;
      if (traceBidPlacement) {
        logBidLatencyTrace({
          scopeType,
          scopeId,
          phase: "publishAuctionState",
          publishAuctionStateMs: elapsedMs(publishStartedAt),
          publishState: elapsedMs(publishStartedAt),
          snapshotMs,
          serializationMs,
          payloadBytes: bytes,
          broadcastMs,
          broadcast: broadcastMs,
          auctionStateSocketEmittedAt: new Date().toISOString(),
          eventName,
        });
      }
      return payload;
    },
    sendToSocket: async (socket, scopeId, reason = "reconnect") => {
      const { payload } = await buildPayload(scopeId, reason);
      socket.emit(eventName, payload);
      return payload;
    },
  };
};
