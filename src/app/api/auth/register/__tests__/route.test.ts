import { testApiHandler } from "next-test-api-route-handler";
import { POST } from "../route";
import { faker } from "@faker-js/faker";

// Mock Prisma client
jest.mock("@/lib/prisma", () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  content: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  recitationProgress: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn()),
}));

const prisma = require("@/lib/prisma");

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it("should register a new user with valid data", async () => {
    const username = faker.internet.userName();
    const email = faker.internet.email();
    const password = faker.internet.password();
    
    // Mock the user creation
    const mockUser = {
      id: faker.string.uuid(),
      username,
      email,
      password_hash: "hashed_password",
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    prisma.user.create.mockResolvedValue(mockUser);

    await testApiHandler({
      handler: POST,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, email, password }),
        });
        const json = await res.json();

        // Check if the response is correct
        expect(res.status).toBe(200);
        expect(json).toHaveProperty("id");
        expect(json.username).toBe(username);
        expect(json.email).toBe(email);

        // Check if prisma.user.create was called
        expect(prisma.user.create).toHaveBeenCalledWith({
          data: {
            username,
            email,
            password_hash: expect.any(String),
          },
        });
      },
    });
  });

  it("should return an error if the email is already taken", async () => {
    const email = faker.internet.email();
    
    // Mock the user creation to throw an error (simulating unique constraint violation)
    prisma.user.create.mockRejectedValue(new Error("Unique constraint violation"));

    await testApiHandler({
      handler: POST,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: faker.internet.userName(),
            email,
            password: faker.internet.password(),
          }),
        });

        // Check if the response is correct
        expect(res.status).toBe(500);
      },
    });
  });

  it("should return an error if the username is already taken", async () => {
    const username = faker.internet.userName();
    
    // Mock the user creation to throw an error (simulating unique constraint violation)
    prisma.user.create.mockRejectedValue(new Error("Unique constraint violation"));

    await testApiHandler({
      handler: POST,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email: faker.internet.email(),
            password: faker.internet.password(),
          }),
        });

        // Check if the response is correct
        expect(res.status).toBe(500);
      },
    });
  });
});
