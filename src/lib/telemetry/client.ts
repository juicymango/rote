import type { EventName } from "@/lib/telemetry/events";

/** Send a product event without making the calling user action depend on telemetry. */
export function trackEvent(eventName: EventName): void {
  try {
    void Promise.resolve(
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_name: eventName }),
      })
    ).catch(() => {
      // Telemetry must never block or fail the user-facing action.
    });
  } catch {
    // A synchronous fetch failure is also intentionally ignored.
  }
}
