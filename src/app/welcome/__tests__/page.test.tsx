import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/navigation redirect
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

// Mock Supabase server client
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Import after mocks
import WelcomePage from "../page";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const mockRedirect = jest.mocked(redirect);
const mockCreateClient = jest.mocked(createClient);

describe("WelcomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /auth/login when user is not authenticated", async () => {
    const mockGetUser = jest.fn().mockResolvedValue({ data: { user: null } });
    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
    } as never);

    await WelcomePage();

    expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
  });

  it("renders welcome message with user email when authenticated", async () => {
    const mockGetUser = jest.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });
    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
    } as never);

    const component = await WelcomePage();
    render(component as React.ReactElement);

    expect(screen.getByRole("heading", { name: /welcome to rote/i })).toBeInTheDocument();
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument();
  });

  it("renders sign out button when authenticated", async () => {
    const mockGetUser = jest.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "user@example.com" } },
    });
    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
    } as never);

    const component = await WelcomePage();
    render(component as React.ReactElement);

    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
