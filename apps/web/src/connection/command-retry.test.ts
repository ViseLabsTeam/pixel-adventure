import { expect, it } from "vitest";
import { isRetryableFailure } from "./command-retry";

it("conserva el comando original cuando hay saturación o guardado incierto", () => {
  expect(isRetryableFailure("RATE_LIMITED")).toBe(true);
  expect(isRetryableFailure("STORAGE_UNAVAILABLE")).toBe(true);
  expect(isRetryableFailure("INVALID_COMMAND")).toBe(false);
});
