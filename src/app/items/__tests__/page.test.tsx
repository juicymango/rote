import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

jest.mock("@/components/items/ItemRow", () => ({
  __esModule: true,
  default: ({ itemKey, value }: { itemKey: string; value: string }) => (
    <div data-testid="item-row">
      <span>{itemKey}</span>
      <span>{value}</span>
    </div>
  ),
}));

import ItemsPage from "../page";
import { useRouter } from "next/navigation";

const mockUseRouter = jest.mocked(useRouter);

describe("ItemsPage", () => {
  let mockReplace: jest.Mock;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace = jest.fn();
    mockFetch = jest.fn();
    mockUseRouter.mockReturnValue({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() } as never);
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ItemsPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders the first page of items", async () => {
    const items = [
      { id: "1", key: "Question 1", value: "Answer 1", created_at: "2026-03-01T00:00:00Z", next_review_at: "2026-03-01", interval_days: 1, consecutive_correct: 0 },
      { id: "2", key: "Question 2", value: "Answer 2", created_at: "2026-03-02T00:00:00Z", next_review_at: "2026-03-02", interval_days: 2, consecutive_correct: 1 },
    ];
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ items, page: 1, pageSize: 50, total: 2, hasNext: false }),
    } as never);
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByText("My Items")).toBeInTheDocument();
      expect(screen.getAllByTestId("item-row")).toHaveLength(2);
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/items?page=1&pageSize=50");
  });

  it("shows empty state message when no items", async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ items: [], page: 1, pageSize: 50, total: 0, hasNext: false }),
    } as never);
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
    });
  });

  it("shows Start Session, Add Item, and Bulk Import links", async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ items: [], page: 1, pageSize: 50, total: 0, hasNext: false }),
    } as never);
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /start session/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /add item/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /bulk import/i })).toBeInTheDocument();
    });
  });

  it("loads the next page", async () => {
    const firstPageItem = { id: "1", key: "Question 1", value: "Answer 1" };
    const secondPageItem = { id: "51", key: "Question 51", value: "Answer 51" };
    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          items: [firstPageItem],
          page: 1,
          pageSize: 50,
          total: 51,
          hasNext: true,
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          items: [secondPageItem],
          page: 2,
          pageSize: 50,
          total: 51,
          hasNext: false,
        }),
      });
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByText("Question 1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByText("Question 51")).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenNthCalledWith(2, "/api/items?page=2&pageSize=50");
  });

  it("redirects to /auth/login when fetch returns 401", async () => {
    mockFetch.mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => null,
    } as never);
    render(<ItemsPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/auth/login");
    });
  });
});
