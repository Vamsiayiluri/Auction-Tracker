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
    const snapshot = await loadSnapshot(scopeId);
    const serverTime = new Date().toISOString();
    return {
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
  };

  return {
    publish: async (scopeId, reason) => {
      const payload = await buildPayload(scopeId, reason);
      io.to(roomName(scopeId)).emit(eventName, payload);
      return payload;
    },
    sendToSocket: async (socket, scopeId, reason = "reconnect") => {
      const payload = await buildPayload(scopeId, reason);
      socket.emit(eventName, payload);
      return payload;
    },
  };
};
