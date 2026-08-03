import "@testing-library/jest-dom";

// remark-breaks is ESM-only; mock it in Jest while keeping the real plugin in production.
jest.mock("remark-breaks", () => ({
  __esModule: true,
  default: () => () => undefined,
}));
