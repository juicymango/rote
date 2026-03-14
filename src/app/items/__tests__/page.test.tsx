import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/components/items/ItemRow", () => ({
  __esModule: true,
  default: ({ itemKey, valuePreview }: { itemKey: string; valuePreview: string }) => (
    <div data-testid="item-row">
      <span>{itemKey}</span>
      <span>{valuePreview}</span>
    </div>
  ),
}));

import ItemsPage from "../page";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const mockRedirect = jest.mocked(redirect);
const mockCreateClient = jest.mocked(createClient);

function makeSupabaseMock(user: unknown, items: unknown[]) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: items, error: null }),
      }),
    }),
  };
}

describe("ItemsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /auth/login when unauthenticated", async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock(null, []) as never
    );
    await ItemsPage();
    expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
  });

  it("renders item list when authenticated", async () => {
    const items = [
      { id: "1", key: "Question 1", value: "Answer 1", created_at: "2026-03-01" },
      { id: "2", key: "Question 2", value: "Answer 2", created_at: "2026-03-02" },
    ];
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ id: "user-1" }, items) as never
    );
    const component = await ItemsPage();
    render(component as React.ReactElement);

    expect(screen.getByText("My Items")).toBeInTheDocument();
    expect(screen.getAllByTestId("item-row")).toHaveLength(2);
  });

  it("shows empty state message when no items", async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ id: "user-1" }, []) as never
    );
    const component = await ItemsPage();
    render(component as React.ReactElement);

    expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
  });

  it("shows Start Session and Add Item links", async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ id: "user-1" }, []) as never
    );
    const component = await ItemsPage();
    render(component as React.ReactElement);

    expect(screen.getByRole("link", { name: /start session/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add item/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /bulk import/i })).toBeInTheDocument();
  });
});
