export const safeApplySocketEvent = ({
  eventName,
  payload,
  apply,
  fallbackRefresh,
  setError,
}) => {
  try {
    return apply(payload);
  } catch (error) {
    console.error("[SOCKET_EVENT_ERROR]", {
      eventName,
      message: error?.message || String(error),
      payload,
    });
    setError?.("Live updates were interrupted. The latest state is being restored.");
    fallbackRefresh?.();
    return undefined;
  }
};
