import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown">{children}</div>
  ),
}));

global.fetch = jest.fn();
const mockFetch = jest.mocked(global.fetch);

const TODAY_STR = new Date().toISOString().slice(0, 10);

function makeCard(id: string, overrides = {}) {
  return {
    id,
    key: `Key ${id}`,
    value: `Value ${id}`,
    next_review_at: TODAY_STR,
    interval_days: 1,
    consecutive_correct: 0,
    created_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

import SessionPage from "../page";

/** Renders SessionPage and clicks "Start Session" to proceed past the setup screen. */
async function renderAndStart() {
  render(<SessionPage />);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /start session/i })).toBeInTheDocument();
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /start session/i }));
  });
}

describe("SessionPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("shows setup screen initially with old/new card count inputs", () => {
    render(<SessionPage />);
    expect(screen.getByRole("heading", { name: /start session/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start session/i })).toBeInTheDocument();
    expect(screen.getByText(/prefetch old cards/i)).toBeInTheDocument();
    expect(screen.getByText(/prefetch new cards/i)).toBeInTheDocument();
  });

  it("calls API with fetchOld/fetchNew values (not maxOld/maxNew)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    render(<SessionPage />);

    // Default fetchOld=100, fetchNew=100
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start session/i }));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("old=100&new=100")
      );
    });
  });

  it("shows loading state after clicking Start Session", async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<SessionPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start session/i }));
    });
    expect(screen.getByText(/loading session/i)).toBeInTheDocument();
  });

  it("shows empty state when no cards are returned", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);
    await renderAndStart();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /no cards due/i })).toBeInTheDocument();
    });
  });

  it("renders the first card key", async () => {
    const cards = [makeCard("1"), makeCard("2")];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => cards,
    } as Response);
    await renderAndStart();
    await waitFor(() => {
      const hasCard =
        screen.queryByText("Key 1") !== null ||
        screen.queryByText("Key 2") !== null;
      expect(hasCard).toBe(true);
    });
  });

  it("shows only Show Answer button initially (no Remembered/Forgot)", async () => {
    const cards = [makeCard("1")];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => cards,
    } as Response);
    await renderAndStart();
    await waitFor(() => screen.getByText("Key 1"));

    // Only Show Answer button should be visible
    expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument();
    // Remembered and Forgot buttons should NOT be visible yet
    expect(screen.queryByRole("button", { name: /remembered/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /forgot/i })).not.toBeInTheDocument();
    // Value should NOT be visible yet
    expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();
  });

  it("Show Answer reveals value and Remembered/Forgot buttons", async () => {
    const cards = [makeCard("1")];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => cards,
    } as Response);
    await renderAndStart();
    await waitFor(() => screen.getByText("Key 1"));

    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));

    // Value revealed
    expect(screen.getByTestId("markdown")).toBeInTheDocument();
    // Remembered and Forgot buttons appear
    expect(screen.getByRole("button", { name: /remembered/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /forgot/i })).toBeInTheDocument();
    // Show Answer button is gone
    expect(screen.queryByRole("button", { name: /show answer/i })).not.toBeInTheDocument();
  });

  it("Forgot button advances to next card immediately", async () => {
    const cards = [makeCard("1"), makeCard("2")];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => cards,
    } as Response);
    await renderAndStart();
    await waitFor(() => {
      const hasCard =
        screen.queryByText("Key 1") !== null ||
        screen.queryByText("Key 2") !== null;
      expect(hasCard).toBe(true);
    });

    // Show Answer
    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
    expect(screen.getByTestId("markdown")).toBeInTheDocument();

    // Forgot on first card — should advance immediately
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /forgot/i }));
    });

    // Should be back to unrevealed state (Show Answer button visible, value hidden)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /remembered/i })).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();
    });
  });

  it("graduates card and shows confirmation screen after 3 consecutive remembered (single card)", async () => {
    // Single card: after 3 "remembered" answers it graduates and shows confirmation
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [makeCard("1")],
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response); // session complete POST

    await renderAndStart();
    await waitFor(() => screen.getByText("Key 1"));

    for (let i = 0; i < 3; i++) {
      // Click Show Answer
      await waitFor(() => screen.getByRole("button", { name: /show answer/i }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
      });
      // Click Remembered
      await waitFor(() => screen.getByRole("button", { name: /remembered/i }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /remembered/i }));
      });
    }

    // Should show confirmation screen
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /confirm review schedule/i })).toBeInTheDocument();
    });

    // Confirm and save
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /confirm and save/i }));
    });

    // Should show completion screen
    await waitFor(() => {
      expect(screen.getByText(/session complete/i)).toBeInTheDocument();
    });
  });

  it("resets consecutive count on forgot and advances to next card", async () => {
    const cards = [makeCard("1"), makeCard("2")];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => cards,
    } as Response);
    await renderAndStart();
    await waitFor(() => {
      const hasCard =
        screen.queryByText("Key 1") !== null ||
        screen.queryByText("Key 2") !== null;
      expect(hasCard).toBe(true);
    });

    // Show Answer
    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
    // Click Forgot - should advance immediately
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /forgot/i }));
    });

    // Should be back to unrevealed state with a different card
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument();
      expect(screen.getByText(/remaining/i)).toBeInTheDocument();
    });
  });

  it("shows confirmation screen when session ends early with reviewed cards", async () => {
    const cards = [makeCard("1"), makeCard("2")];
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => cards,
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

    await renderAndStart();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /end session/i })).toBeInTheDocument();
    });

    // Review one card first
    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /remembered/i }));
    });

    // End session early
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /end session/i }));
    });

    // Should show confirmation screen
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /confirm review schedule/i })).toBeInTheDocument();
    });
  });

  it("shows Edit value button when answer is revealed", async () => {
    const cards = [makeCard("1")];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => cards,
    } as Response);
    await renderAndStart();
    await waitFor(() => screen.getByText("Key 1"));

    // Show Answer
    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));

    // Edit value button should appear
    expect(screen.getByRole("button", { name: /edit value/i })).toBeInTheDocument();
  });

  it("enables inline editing of card value", async () => {
    const cards = [makeCard("1")];
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => cards,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...cards[0], value: "Updated value" }),
      } as Response);

    await renderAndStart();
    await waitFor(() => screen.getByText("Key 1"));

    // Show Answer
    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /edit value/i }));

    // Should show textarea with current value
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("Value 1");

    // Edit the value
    fireEvent.change(textarea, { target: { value: "Updated value" } });
    expect(textarea).toHaveValue("Updated value");

    // Save
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/items/1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ key: "Key 1", value: "Updated value" }),
        })
      );
      // Should exit edit mode
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  it("can cancel editing without saving", async () => {
    const cards = [makeCard("1")];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => cards,
    } as Response);

    await renderAndStart();
    await waitFor(() => screen.getByText("Key 1"));

    // Show Answer and start editing
    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /edit value/i }));

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Changed but cancelled" } });

    // Cancel
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Should exit edit mode without saving
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByTestId("markdown")).toHaveTextContent("Value 1");
    });
  });

  it("disables Remembered/Forgot buttons while editing", async () => {
    const cards = [makeCard("1")];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => cards,
    } as Response);

    await renderAndStart();
    await waitFor(() => screen.getByText("Key 1"));

    // Show Answer and start editing
    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /edit value/i }));

    // Remembered and Forgot buttons should be disabled
    expect(screen.getByRole("button", { name: /remembered/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /forgot/i })).toBeDisabled();
  });

  describe("Post-session confirmation screen", () => {
    it("allows user to override next_review_at for individual cards", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [makeCard("1")],
        } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

      await renderAndStart();
      await waitFor(() => screen.getByText("Key 1"));

      // Graduate the card
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: /remembered/i }));
        });
      }

      // Should show confirmation screen with date input
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /confirm review schedule/i })).toBeInTheDocument();
      });

      // Find the date input and change it
      const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
      fireEvent.change(dateInput, { target: { value: "2026-04-01" } });

      // Confirm and save
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /confirm and save/i }));
      });

      // Verify the override was sent in the API call
      await waitFor(() => {
        const calls = mockFetch.mock.calls.filter(
          (call) => call[0] === "/api/session/complete"
        );
        expect(calls.length).toBe(1);
        const body = JSON.parse(calls[0][1]?.body as string);
        expect(body.results[0].next_review_at_override).toBe("2026-04-01");
      });
    });

    it("uses algorithm-computed date as default override when Use Defaults is clicked", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [makeCard("1")],
        } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

      await renderAndStart();
      await waitFor(() => screen.getByText("Key 1"));

      // Graduate the card
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: /remembered/i }));
        });
      }

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /confirm review schedule/i })).toBeInTheDocument();
      });

      // Click "Use Defaults" button
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /use defaults/i }));
      });

      // Verify algorithm-computed date was sent as the override
      await waitFor(() => {
        const calls = mockFetch.mock.calls.filter(
          (call) => call[0] === "/api/session/complete"
        );
        expect(calls.length).toBe(1);
        const body = JSON.parse(calls[0][1]?.body as string);
        // Override is pre-populated with algorithm date to prevent server recomputation timezone drift
        expect(body.results[0].next_review_at_override).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it("shows card key (not Unknown) in confirmation screen after graduation", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [makeCard("1")],
        } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

      await renderAndStart();
      await waitFor(() => screen.getByText("Key 1"));

      // Graduate the card (removes it from pool)
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: /remembered/i }));
        });
      }

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /confirm review schedule/i })).toBeInTheDocument();
      });

      // Card key should be shown, not "Unknown"
      expect(screen.getByText("Key 1")).toBeInTheDocument();
      expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    });

    it("shows algorithm-computed date by default in confirmation screen", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [makeCard("1")],
        } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

      await renderAndStart();
      await waitFor(() => screen.getByText("Key 1"));

      // Graduate the card
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: /remembered/i }));
        });
      }

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /confirm review schedule/i })).toBeInTheDocument();
      });

      // Date input should have a default value (algorithm-computed, in YYYY-MM-DD format)
      const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
      expect(dateInput).toBeInTheDocument();
      // Just verify it's a valid date string
      const value = (dateInput as HTMLInputElement).value;
      expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("Auto-save", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("fires fetch to /api/session/complete after 30 seconds when there are results", async () => {
      const cards = [makeCard("1"), makeCard("2")];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => cards,
      } as Response);

      await renderAndStart();
      await waitFor(() => {
        const hasCard =
          screen.queryByText("Key 1") !== null ||
          screen.queryByText("Key 2") !== null;
        expect(hasCard).toBe(true);
      });

      // Record a result by clicking Remembered on one card
      fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /remembered/i }));
      });

      // Clear any calls so far (session load fetch)
      mockFetch.mockClear();

      // Advance 30 seconds
      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      // Should have called /api/session/complete
      const autoSaveCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === "/api/session/complete"
      );
      expect(autoSaveCalls.length).toBe(1);
      expect(autoSaveCalls[0][1]).toMatchObject({
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      });
      const body = JSON.parse(autoSaveCalls[0][1]?.body as string);
      expect(body.results).toHaveLength(1);
      expect(body.results[0]).not.toHaveProperty("next_review_at_override");
    });

    it("does not fire fetch when results are empty after 30 seconds", async () => {
      const cards = [makeCard("1")];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => cards,
      } as Response);

      await renderAndStart();
      await waitFor(() => screen.getByText("Key 1"));

      // Clear fetch calls (session load)
      mockFetch.mockClear();

      // Advance 30 seconds without reviewing any cards
      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      // Should NOT have called /api/session/complete
      const autoSaveCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === "/api/session/complete"
      );
      expect(autoSaveCalls.length).toBe(0);
    });
  });

  describe("Session status panel", () => {
    it("toggles status panel visibility", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [makeCard("1")],
      } as Response);

      await renderAndStart();
      await waitFor(() => screen.getByText("Key 1"));

      // Status panel should not be visible initially
      expect(screen.queryByText(/session status/i)).not.toBeInTheDocument();

      // Click Show Status
      fireEvent.click(screen.getByRole("button", { name: /show status/i }));

      // Status panel should be visible
      expect(screen.getByText(/session status/i)).toBeInTheDocument();

      // Click Hide Status
      fireEvent.click(screen.getByRole("button", { name: /hide status/i }));

      // Status panel should be hidden again
      expect(screen.queryByText(/session status/i)).not.toBeInTheDocument();
    });

    it("displays remembered count in status panel", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [makeCard("1"), makeCard("2")],
      } as Response);

      await renderAndStart();
      await waitFor(() => {
        const hasCard =
          screen.queryByText("Key 1") !== null ||
          screen.queryByText("Key 2") !== null;
        expect(hasCard).toBe(true);
      });

      // Show status panel
      fireEvent.click(screen.getByRole("button", { name: /show status/i }));

      // Initially 0 remembered
      expect(screen.getByText(/remembered this session/i)).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();

      // Remember one card
      fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /remembered/i }));
      });

      // Should show 1 remembered
      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
      });
    });

    it("displays current pool with status in status panel", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [makeCard("1"), makeCard("2")],
      } as Response);

      await renderAndStart();
      await waitFor(() => {
        const hasCard =
          screen.queryByText("Key 1") !== null ||
          screen.queryByText("Key 2") !== null;
        expect(hasCard).toBe(true);
      });

      // Show status panel
      fireEvent.click(screen.getByRole("button", { name: /show status/i }));

      // Should show current pool
      expect(screen.getByText(/current pool/i)).toBeInTheDocument();

      // Both keys should appear (in the pool list and possibly in the card display)
      const key1Elements = screen.getAllByText("Key 1");
      const key2Elements = screen.getAllByText("Key 2");
      expect(key1Elements.length).toBeGreaterThan(0);
      expect(key2Elements.length).toBeGreaterThan(0);

      // Should show "pending" status
      const pendingBadges = screen.getAllByText(/pending/i);
      expect(pendingBadges.length).toBeGreaterThan(0);
    });
  });
});
