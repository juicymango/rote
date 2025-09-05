import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { faker } from "@faker-js/faker";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  user: {
    findUnique: jest.fn(),
  },
}));

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
}));

const prisma = require("@/lib/prisma");
const bcrypt = require("bcrypt");

// Mock NextResponse for testing
const mockJson = jest.fn();
const mockNextResponse = {
  json: mockJson,
};

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, options) => {
      mockJson(data, options);
      return { status: options?.status || 200 };
    }),
  },
}));

// Import the handler after mocking
const { POST } = require("../route");

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should login successfully with valid credentials", async () => {
    const email = faker.internet.email();
    const password = faker.internet.password();
    
    const mockUser = {
      id: faker.string.uuid(),
      username: faker.internet.username(),
      email,
      password_hash: "hashed_password",
      created_at: new Date(),
      updated_at: new Date(),
    };

    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    mockJson.mockReturnValue({ status: 200 });

    // Mock Request object
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ email, password }),
    };

    const response = await POST(mockRequest as any);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email },
    });
    expect(bcrypt.compare).toHaveBeenCalledWith(password, "hashed_password");
  });

  it("should return error for missing email or password", async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ email: "test@example.com" }),
    };

    mockJson.mockReturnValue({ status: 400 });
    const response = await POST(mockRequest as any);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Email and password are required" },
      { status: 400 }
    );
  });

  it("should return error for non-existent user", async () => {
    const email = faker.internet.email();
    const password = faker.internet.password();

    prisma.user.findUnique.mockResolvedValue(null);

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ email, password }),
    };

    mockJson.mockReturnValue({ status: 401 });
    const response = await POST(mockRequest as any);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  });

  it("should return error for invalid password", async () => {
    const email = faker.internet.email();
    const password = faker.internet.password();
    
    const mockUser = {
      id: faker.string.uuid(),
      username: faker.internet.username(),
      email,
      password_hash: "hashed_password",
      created_at: new Date(),
      updated_at: new Date(),
    };

    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ email, password }),
    };

    mockJson.mockReturnValue({ status: 401 });
    const response = await POST(mockRequest as any);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  });
});