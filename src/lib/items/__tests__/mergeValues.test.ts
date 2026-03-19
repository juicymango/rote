import { mergeValues } from "../mergeValues";

describe("mergeValues", () => {
  it("prepends new value before existing value with a blank line separator", () => {
    expect(mergeValues("new", "old")).toBe("new\n\nold");
  });

  it("trims leading and trailing whitespace from both values", () => {
    expect(mergeValues("  new  ", "  old  ")).toBe("new\n\nold");
  });

  it("preserves multi-line content in both values", () => {
    const newVal = "line 1\nline 2";
    const oldVal = "line A\nline B";
    expect(mergeValues(newVal, oldVal)).toBe("line 1\nline 2\n\nline A\nline B");
  });

  it("returns existing value when new value is empty", () => {
    expect(mergeValues("", "old content")).toBe("old content");
  });

  it("returns new value when existing value is empty", () => {
    expect(mergeValues("new content", "")).toBe("new content");
  });
});
