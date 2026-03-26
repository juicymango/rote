import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

import WelcomePage from "../page";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const mockUseRouter = jest.mocked(useRouter);
const mockCreateClient = jest.mocked(createClient);

describe("WelcomePage", () => {
  let mockReplace: jest.Mock;
  let mockSignOut: jest.Mock;
  let mockGetUser: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace = jest.fn();
    mockSignOut = jest.fn().mockResolvedValue({});
    mockGetUser = jest.fn();
    mockUseRouter.mockReturnValue({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() } as never);
    mockCreateClient.mockReturnValue({
      auth: { getUser: mockGetUser, signOut: mockSignOut },
    } as never);
  });

  it("redirects to /auth/login when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(<WelcomePage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/auth/login");
    });
  });

  it("renders welcome message with user email when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });
    render(<WelcomePage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /welcome to rote/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument();
  });

  it("renders sign out button when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "user@example.com" } },
    });
    render(<WelcomePage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });
  });

  it("renders Go to Items and Start Session links when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "user@example.com" } },
    });
    render(<WelcomePage />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /go to items/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /start session/i })).toBeInTheDocument();
  });

  it("calls signOut and redirects to /auth/login on sign out", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "user@example.com" } },
    });
    render(<WelcomePage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/auth/login");
    });
  });
});
