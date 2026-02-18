export const SUBMISSION_ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const SUBMISSION_ATTACHMENT_ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const SUBMISSION_ATTACHMENT_STALE_CLEANUP_MS = 24 * 60 * 60 * 1000;
