import { trackEvent } from "../client";

describe("trackEvent", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it("sends an allowlisted event to the events API", () => {
    trackEvent("session_started");

    expect(mockFetch).toHaveBeenCalledWith("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_name: "session_started" }),
    });
  });

  it("does not throw when telemetry fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("network unavailable"));

    expect(() => trackEvent("session_completed")).not.toThrow();
    await Promise.resolve();
  });
});
