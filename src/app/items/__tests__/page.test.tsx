import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
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
import { createClient } from "@/lib/supabase/client";

const mockUseRouter = jest.mocked(useRouter);
const mockCreateClient = jest.mocked(createClient);

describe("ItemsPage", () => {
  let mockReplace: jest.Mock;
  let mockGetUser: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace = jest.fn();
    mockGetUser = jest.fn();
    mockUseRouter.mockReturnValue({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() } as never);
    mockCreateClient.mockReturnValue({
      auth: { getUser: mockGetUser },
    } as never);
  });

  it("redirects to /auth/login when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(<ItemsPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/auth/login");
    });
  });

  it("shows loading state initially", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})); // never resolves
    render(<ItemsPage />);
    // loading state shown while auth check is still pending (before getUser resolves)
    // After auth resolves, loading is shown while fetch is pending
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  it("renders item list when authenticated", async () => {
    const items = [
      { id: "1", key: "Question 1", value: "Answer 1", created_at: "2026-03-01T00:00:00Z", next_review_at: "2026-03-01", interval_days: 1, consecutive_correct: 0 },
      { id: "2", key: "Question 2", value: "Answer 2", created_at: "2026-03-02T00:00:00Z", next_review_at: "2026-03-02", interval_days: 2, consecutive_correct: 1 },
    ];
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => items,
    } as never);
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByText("My Items")).toBeInTheDocument();
      expect(screen.getAllByTestId("item-row")).toHaveLength(2);
    });
  });

  it("shows empty state message when no items", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => [],
    } as never);
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
    });
  });

  it("shows Start Session, Add Item, and Bulk Import links", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => [],
    } as never);
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /start session/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /add item/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /bulk import/i })).toBeInTheDocument();
    });
  });

  it("redirects to /auth/login when fetch returns 401", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      json: async () => null,
    } as never);
    render(<ItemsPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/auth/login");
    });
  });
});
