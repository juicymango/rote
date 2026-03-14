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
});
