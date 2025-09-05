import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { faker } from "@faker-js/faker";

// Simple test to verify Jest configuration
describe("Jest Configuration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should pass a simple test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should generate fake data", () => {
    const username = faker.internet.userName();
    const email = faker.internet.email();
    
    expect(username).toBeDefined();
    expect(email).toBeDefined();
    expect(email).toContain("@");
  });
});