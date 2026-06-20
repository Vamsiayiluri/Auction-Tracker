export const getData = (response, fallback = null) =>
  response?.data && Object.prototype.hasOwnProperty.call(response.data, "data")
    ? response.data.data ?? fallback
    : fallback;

export const getArrayData = (response, fallback = []) => {
  const data = getData(response, fallback);
  return Array.isArray(data) ? data : fallback;
};

export const requireObjectData = (response, label = "Response") => {
  const data = getData(response, null);
  if (!data || Array.isArray(data) || typeof data !== "object") {
    throw new Error(`${label} was not returned in the expected format.`);
  }
  return data;
};

export const getApiMessage = (error, fallback = "Something went wrong.") => {
  if (!navigator.onLine) return "You appear to be offline. Check your connection and try again.";
  if (error?.code === "ECONNABORTED") return "The request timed out. Please try again.";
  if (error?.response?.status >= 500) return "The server is temporarily unavailable. Please try again.";
  if (error?.response?.status === 401) return "Your session has expired. Please sign in again.";
  if (error?.response?.status === 403) return "You do not have permission to perform this action.";
  return (
    error?.response?.data?.message ||
    error?.response?.data?.errors?.[0]?.message ||
    error?.message ||
    fallback
  );
};
