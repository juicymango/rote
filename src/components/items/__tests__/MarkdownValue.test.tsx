import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({
    children,
    remarkPlugins,
  }: {
    children: string;
    remarkPlugins?: unknown[];
  }) => (
    <div
      data-testid="markdown"
      data-remark-plugin-count={String(remarkPlugins?.length ?? 0)}
    >
      {children}
    </div>
  ),
}));

import MarkdownValue from "../MarkdownValue";

describe("MarkdownValue", () => {
  it("enables single-newline breaks for Markdown values", () => {
    render(<MarkdownValue>{"line one\nline two"}</MarkdownValue>);

    expect(screen.getByTestId("markdown")).toHaveAttribute(
      "data-remark-plugin-count",
      "1"
    );
    expect(screen.getByTestId("markdown")).toHaveTextContent("line one");
    expect(screen.getByTestId("markdown")).toHaveTextContent("line two");
  });
});
