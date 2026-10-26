export function isRetryableFailure(code: string) {
  return code === "STORAGE_UNAVAILABLE" || code === "RATE_LIMITED";
}
