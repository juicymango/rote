import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown-preview">{children}</div>,
}));

global.fetch = jest.fn();
const mockFetch = jest.mocked(global.fetch);

import NewItemPage from "../page";

describe("NewItemPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the form with key and value fields", () => {
    render(<NewItemPage />);
    expect(screen.getByLabelText(/key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/value/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save item/i })).toBeInTheDocument();
  });

  it("shows markdown preview when value is typed", () => {
    render(<NewItemPage />);
    const textarea = screen.getByLabelText(/value/i);
    fireEvent.change(textarea, { target: { value: "**bold text**" } });
    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
  });

  it("shows error when key is empty on submit", async () => {
    render(<NewItemPage />);
    fireEvent.change(screen.getByLabelText(/value/i), { target: { value: "v" } });
    fireEvent.click(screen.getByRole("button", { name: /save item/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/key is required/i);
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows error when value is empty on submit", async () => {
    render(<NewItemPage />);
    fireEvent.change(screen.getByLabelText(/key/i), { target: { value: "k" } });
    fireEvent.click(screen.getByRole("button", { name: /save item/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/value is required/i);
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls API and redirects to /items on successful submit", async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);
    render(<NewItemPage />);
    fireEvent.change(screen.getByLabelText(/key/i), { target: { value: "my key" } });
    fireEvent.change(screen.getByLabelText(/value/i), { target: { value: "my value" } });
    fireEvent.click(screen.getByRole("button", { name: /save item/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/items", expect.objectContaining({
        method: "POST",
      }));
      expect(mockPush).toHaveBeenCalledWith("/items");
    });
  });

  it("shows error message on API failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      text: async () => "Internal server error",
    } as Response);
    render(<NewItemPage />);
    fireEvent.change(screen.getByLabelText(/key/i), { target: { value: "k" } });
    fireEvent.change(screen.getByLabelText(/value/i), { target: { value: "v" } });
    fireEvent.click(screen.getByRole("button", { name: /save item/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/internal server error/i);
    });
  });
});
