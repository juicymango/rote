import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/navigation redirect
const mockRedirect = jest.fn();
jest.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// Mock Supabase server client
const mockGetUser = jest.fn();
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    })
  ),
}));

// Import after mocks
import WelcomePage from "../page";

describe("WelcomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /auth/login when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await WelcomePage();

    expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
  });

  it("renders welcome message with user email when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    const component = await WelcomePage();
    render(component as React.ReactElement);

    expect(screen.getByRole("heading", { name: /welcome to rote/i })).toBeInTheDocument();
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument();
  });

  it("renders sign out button when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "user@example.com" } },
    });

    const component = await WelcomePage();
    render(component as React.ReactElement);

    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
