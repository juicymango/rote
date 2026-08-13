import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

import DemoSession from "../DemoSession";

describe("DemoSession", () => {
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  it("lets an anonymous visitor review every sample card without fetching", () => {
    render(<DemoSession />);

    expect(screen.getByRole("heading", { name: /try a sample review/i })).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
      expect(screen.getByRole("button", { name: /forgot/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /remembered/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /remembered/i }));
    }

    expect(screen.getByRole("heading", { name: /demo complete/i })).toBeInTheDocument();
    expect(screen.getByText(/3 cards: 3 remembered and 0 to revisit/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("can reset the demo after a completed review", () => {
    render(<DemoSession />);

    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
      fireEvent.click(screen.getByRole("button", { name: /remembered/i }));
    }

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByRole("heading", { name: /try a sample review/i })).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show answer/i })).toBeInTheDocument();
  });
});
