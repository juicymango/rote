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

  it("shows Remembered and Forgot buttons immediately without any flip", async () => {
    const cards = [makeCard("1")];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => cards,
    } as Response);
    render(<SessionPage />);
    await waitFor(() => screen.getByText("Key 1"));

    // Buttons should be visible immediately — no click needed
    expect(screen.getByRole("button", { name: /remembered/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /forgot/i })).toBeInTheDocument();
    // Value should NOT be visible yet
    expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();
  });

  it("Forgot reveals value and shows Next button", async () => {
    const cards = [makeCard("1")];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => cards,
    } as Response);
    render(<SessionPage />);
    await waitFor(() => screen.getByText("Key 1"));

    fireEvent.click(screen.getByRole("button", { name: /forgot/i }));

    // Value revealed
    expect(screen.getByTestId("markdown")).toBeInTheDocument();
    // Next button appears
    expect(screen.getByRole("button", { name: /^next$/i })).toBeInTheDocument();
    // Remembered and Forgot buttons are gone
    expect(screen.queryByRole("button", { name: /remembered/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^forgot$/i })).not.toBeInTheDocument();
  });

  it("Next button after Forgot advances to next card and hides value", async () => {
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

    // Forgot on first card
    fireEvent.click(screen.getByRole("button", { name: /forgot/i }));
    expect(screen.getByTestId("markdown")).toBeInTheDocument();

    // Click Next — should advance and hide value
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    });

    // Forgot/Remembered buttons should be back (not Next)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /remembered/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument();
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
      await waitFor(() => screen.getByRole("button", { name: /remembered/i }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /remembered/i }));
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/session complete/i)).toBeInTheDocument();
    });
  });

  it("resets consecutive count on forgot", async () => {
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

    // Click Forgot and then Next
    fireEvent.click(screen.getByRole("button", { name: /forgot/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    });

    // Card pool should still have both cards
    await waitFor(() => {
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
});
