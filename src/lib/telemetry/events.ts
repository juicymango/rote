export const EVENT_NAMES = [
  "item_created",
  "bulk_import_completed",
  "session_started",
  "session_completed",
  "session_save_failed",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && EVENT_NAMES.includes(value as EventName);
}
