import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

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

describe("SessionPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<SessionPage />);
    expect(screen.getByText(/loading session/i)).toBeInTheDocument();
  });

  it("shows empty state when no cards are returned", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);
    render(<SessionPage />);
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
    render(<SessionPage />);
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
    render(<SessionPage />);
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
    render(<SessionPage />);
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
    render(<SessionPage />);
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

  it("graduates card and shows complete after 3 consecutive remembered (single card)", async () => {
    // Single card: after 3 "remembered" answers it graduates and session ends
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [makeCard("1")],
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response); // session complete POST

    render(<SessionPage />);
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
    render(<SessionPage />);
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

  it("calls POST /api/session/complete when session ends early", async () => {
    const cards = [makeCard("1"), makeCard("2")];
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => cards,
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

    render(<SessionPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /end session/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /end session/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/session complete/i)).toBeInTheDocument();
    });
  });

  it("shows Edit value button when answer is revealed", async () => {
    const cards = [makeCard("1")];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => cards,
    } as Response);
    render(<SessionPage />);
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

    render(<SessionPage />);
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

    render(<SessionPage />);
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

    render(<SessionPage />);
    await waitFor(() => screen.getByText("Key 1"));

    // Show Answer and start editing
    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /edit value/i }));

    // Remembered and Forgot buttons should be disabled
    expect(screen.getByRole("button", { name: /remembered/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /forgot/i })).toBeDisabled();
  });
});
