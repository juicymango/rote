import { config } from "dotenv";
import "@testing-library/jest-dom";

// Load test environment variables
config({ path: ".env.test" });

// Mock bcrypt
jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
