export function getSafeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
