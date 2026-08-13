import { render, screen } from "@testing-library/react";

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

import TryPage from "../page";

describe("TryPage", () => {
  it("renders the public demo and existing authentication links", () => {
    render(<TryPage />);

    expect(screen.getByRole("heading", { name: /remember more with less effort/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /try a sample review/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create a free account/i })).toHaveAttribute(
      "href",
      "/auth/register"
    );
    expect(screen.getByRole("link", { name: /^log in$/i })).toHaveAttribute("href", "/auth/login");
    expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute("href", "/privacy");
  });
});
