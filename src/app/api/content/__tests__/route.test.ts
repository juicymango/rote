import { testApiHandler } from "next-test-api-route-handler";
import { POST, GET } from "../route";
import { faker } from "@faker-js/faker";
import { getServerSession } from "next-auth";

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
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn()),
}));

const prisma = require("@/lib/prisma");

// Mock the getServerSession function
jest.mock("next-auth");
const mockGetServerSession = getServerSession as jest.Mock;

describe("POST /api/content", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new piece of content for an authenticated user", async () => {
    const mockUser = {
      id: faker.string.uuid(),
      username: faker.internet.username(),
      email: faker.internet.email(),
      password_hash: "hashed_password",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockContent = {
      id: faker.string.uuid(),
      user_id: mockUser.id,
      title: faker.lorem.sentence(),
      body: faker.lorem.paragraph(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    prisma.user.create.mockResolvedValue(mockUser);
    prisma.content.create.mockResolvedValue(mockContent);
    mockGetServerSession.mockReturnValue(Promise.resolve({ user: { id: mockUser.id } }));

    const title = faker.lorem.sentence();
    const body = faker.lorem.paragraph();

    await testApiHandler({
      appHandler: POST,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title, body }),
        });
        const json = await res.json();

        // Check if the response is correct
        expect(res.status).toBe(200);
        expect(json).toHaveProperty("id");
        expect(json.title).toBe(title);
        expect(json.body).toBe(body);

        // Check if the content is created in the database
        const content = await prisma.content.findUnique({ where: { id: json.id } });
        expect(content).not.toBeNull();
      },
    });
  });

  it("should return an error if the user is not authenticated", async () => {
    mockGetServerSession.mockReturnValue(Promise.resolve(null));

    await testApiHandler({
      handler: POST,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: "test", body: "test" }),
        });

        // Check if the response is correct
        expect(res.status).toBe(401);
      },
    });
  });
});

describe("GET /api/content", () => {
  beforeEach(async () => {
    // Reset the database before each test
    await prisma.content.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it("should return a list of content for an authenticated user", async () => {
    const user = await prisma.user.create({
      data: {
        username: faker.internet.username(),
        email: faker.internet.email(),
        password_hash: faker.internet.password(),
      },
    });

    await prisma.content.create({
      data: {
        title: faker.lorem.sentence(),
        body: faker.lorem.paragraph(),
        userId: user.id,
      },
    });

    mockGetServerSession.mockReturnValue(Promise.resolve({ user: { id: user.id } }));

    await testApiHandler({
      appHandler: GET,
      test: async ({ fetch }) => {
        const res = await fetch();
        const json = await res.json();

        // Check if the response is correct
        expect(res.status).toBe(200);
        expect(json.length).toBe(1);
      },
    });
  });

  it("should return an empty list if the user has no content", async () => {
    const user = await prisma.user.create({
      data: {
        username: faker.internet.username(),
        email: faker.internet.email(),
        password_hash: faker.internet.password(),
      },
    });

    mockGetServerSession.mockReturnValue(Promise.resolve({ user: { id: user.id } }));

    await testApiHandler({
      appHandler: GET,
      test: async ({ fetch }) => {
        const res = await fetch();
        const json = await res.json();

        // Check if the response is correct
        expect(res.status).toBe(200);
        expect(json.length).toBe(0);
      },
    });
  });

  it("should return an error if the user is not authenticated", async () => {
    mockGetServerSession.mockReturnValue(Promise.resolve(null));

    await testApiHandler({
      appHandler: GET,
      test: async ({ fetch }) => {
        const res = await fetch();

        // Check if the response is correct
        expect(res.status).toBe(401);
      },
    });
  });
});
