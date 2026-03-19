import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

global.fetch = jest.fn();
const mockFetch = jest.mocked(global.fetch);

import BulkImportPage from "../page";

describe("BulkImportPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders paste textarea and parse button", () => {
    render(<BulkImportPage />);
    expect(screen.getByLabelText(/paste markdown/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /parse/i })).toBeInTheDocument();
  });

  it("shows 0 items found when markdown has no H1 headings", () => {
    render(<BulkImportPage />);
    fireEvent.change(screen.getByLabelText(/paste markdown/i), {
      target: { value: "no headings here" },
    });
    fireEvent.click(screen.getByRole("button", { name: /parse/i }));
    expect(screen.getByText(/0 items? found/i)).toBeInTheDocument();
  });

  it("shows parsed items in review step", () => {
    render(<BulkImportPage />);
    fireEvent.change(screen.getByLabelText(/paste markdown/i), {
      target: { value: "# Key One\nValue one content.\n\n# Key Two\nValue two content." },
    });
    fireEvent.click(screen.getByRole("button", { name: /parse/i }));
    expect(screen.getByText(/2 items? found/i)).toBeInTheDocument();
    expect(screen.getByText("Key One")).toBeInTheDocument();
    expect(screen.getByText("Key Two")).toBeInTheDocument();
  });

  it("can go back to paste step from review", () => {
    render(<BulkImportPage />);
    fireEvent.change(screen.getByLabelText(/paste markdown/i), {
      target: { value: "# K\nV" },
    });
    fireEvent.click(screen.getByRole("button", { name: /parse/i }));
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText(/paste markdown/i)).toBeInTheDocument();
  });

  it("calls API and shows done step on confirm import", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ count: 2 }),
    } as Response);

    render(<BulkImportPage />);
    fireEvent.change(screen.getByLabelText(/paste markdown/i), {
      target: { value: "# Key One\nValue one.\n\n# Key Two\nValue two." },
    });
    fireEvent.click(screen.getByRole("button", { name: /parse/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm import/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/items/bulk", expect.objectContaining({
        method: "POST",
      }));
      expect(screen.getByText(/import complete/i)).toBeInTheDocument();
      expect(screen.getByText(/2 items? imported/i)).toBeInTheDocument();
    });
  });

  it("renders checkboxes for each item, all checked by default", () => {
    render(<BulkImportPage />);
    fireEvent.change(screen.getByLabelText(/paste markdown/i), {
      target: { value: "# Key One\nValue one.\n\n# Key Two\nValue two." },
    });
    fireEvent.click(screen.getByRole("button", { name: /parse/i }));

    const checkbox1 = screen.getByLabelText("Include Key One");
    const checkbox2 = screen.getByLabelText("Include Key Two");

    expect(checkbox1).toBeInTheDocument();
    expect(checkbox2).toBeInTheDocument();
    expect(checkbox1).toBeChecked();
    expect(checkbox2).toBeChecked();
  });

  it("can uncheck items to exclude them from import", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ count: 1 }),
    } as Response);

    render(<BulkImportPage />);
    fireEvent.change(screen.getByLabelText(/paste markdown/i), {
      target: { value: "# Key One\nValue one.\n\n# Key Two\nValue two." },
    });
    fireEvent.click(screen.getByRole("button", { name: /parse/i }));

    // Uncheck the second item
    fireEvent.click(screen.getByLabelText("Include Key Two"));
    expect(screen.getByLabelText("Include Key Two")).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: /confirm import/i }));

    await waitFor(() => {
      const callArg = mockFetch.mock.calls[0][1];
      const body = JSON.parse((callArg as RequestInit).body as string);
      expect(body.items).toHaveLength(1);
      expect(body.items[0].key).toBe("Key One");
      expect(screen.getByText(/1 items? imported/i)).toBeInTheDocument();
    });
  });
});
