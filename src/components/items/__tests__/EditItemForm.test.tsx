import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
}));

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="preview">{children}</div>,
}));

import EditItemForm from "../EditItemForm";
import { useRouter } from "next/navigation";

const mockUseRouter = jest.mocked(useRouter);

const defaultItem = {
  id: "item-1",
  key: "Test Key",
  value: "Test Value",
  next_review_at: "2026-03-20",
  interval_days: 2,
  consecutive_correct: 1,
};

describe("EditItemForm", () => {
  let mockPush: jest.Mock;
  let mockRefresh: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush = jest.fn();
    mockRefresh = jest.fn();
    mockUseRouter.mockReturnValue({ push: mockPush, refresh: mockRefresh } as never);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "" });
  });

  it("renders pre-populated fields from props", () => {
    render(<EditItemForm item={defaultItem} />);
    expect(screen.getByDisplayValue("Test Key")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Value")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-03-20")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
  });

  it("shows markdown preview when value is set", () => {
    render(<EditItemForm item={defaultItem} />);
    expect(screen.getByTestId("preview")).toBeInTheDocument();
  });

  it("shows error when key is empty on submit", async () => {
    render(<EditItemForm item={defaultItem} />);
    fireEvent.change(screen.getByLabelText(/^key$/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Key is required.");
  });

  it("shows error when value is empty on submit", async () => {
    render(<EditItemForm item={defaultItem} />);
    fireEvent.change(screen.getByLabelText(/value/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Value is required.");
  });

  it("calls PUT /api/items/[id] on valid submit", async () => {
    render(<EditItemForm item={defaultItem} />);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/items/item-1",
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  it("shows 'key already exists' error on 409 response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => "An item with this key already exists",
    });
    render(<EditItemForm item={defaultItem} />);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A card with this key already exists."
    );
  });

  it("redirects to /items on successful submit", async () => {
    render(<EditItemForm item={defaultItem} />);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/items");
    });
  });
});
