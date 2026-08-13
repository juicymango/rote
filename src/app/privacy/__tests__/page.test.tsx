import { render, screen } from "@testing-library/react";
import PrivacyPage from "../page";

describe("PrivacyPage", () => {
  it("describes stored data and provides deletion contact information", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { name: /^privacy$/i })).toBeInTheDocument();
    expect(screen.getByText(/email address and authentication information/i)).toBeInTheDocument();
    expect(screen.getByText(/do not include card keys, card values/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "381030480@qq.com" })).toHaveAttribute(
      "href",
      "mailto:381030480@qq.com"
    );
  });
});
