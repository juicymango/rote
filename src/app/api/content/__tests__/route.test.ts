import { testApiHandler } from "next-test-api-route-handler";
import { POST, GET } from "../route";
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
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((fn: (arg: unknown) => unknown) => fn({})),
}));

const prisma = require("@/lib/prisma");

// Mock Supabase server client
const mockGetUser = jest.fn();
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe("POST /api/content", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new piece of content for an authenticated user", async () => {
    const mockUser = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
    };

    const title = faker.lorem.sentence();
    const body = faker.lorem.paragraph();

    const mockContent = {
      id: faker.string.uuid(),
      userId: mockUser.id,
      title,
      body,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.content.create.mockResolvedValue(mockContent);

    await testApiHandler({
      appHandler: { POST },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title, body }),
        });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json).toHaveProperty("id");

        expect(prisma.content.create).toHaveBeenCalledWith({
          data: {
            title,
            body,
            userId: mockUser.id,
          },
        });
      },
    });
  });

  it("should return an error if the user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await testApiHandler({
      appHandler: { POST },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: "test", body: "test" }),
        });

        expect(res.status).toBe(401);
      },
    });
  });
});

describe("GET /api/content", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a list of content for an authenticated user", async () => {
    const mockUser = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
    };

    const mockContents = [
      {
        id: faker.string.uuid(),
        userId: mockUser.id,
        title: faker.lorem.sentence(),
        body: faker.lorem.paragraph(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.content.findMany.mockResolvedValue(mockContents);

    await testApiHandler({
      appHandler: { GET },
      test: async ({ fetch }) => {
        const res = await fetch();
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.length).toBe(1);
      },
    });
  });

  it("should return an empty list if the user has no content", async () => {
    const mockUser = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.content.findMany.mockResolvedValue([]);

    await testApiHandler({
      appHandler: { GET },
      test: async ({ fetch }) => {
        const res = await fetch();
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.length).toBe(0);
      },
    });
  });

  it("should return an error if the user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await testApiHandler({
      appHandler: { GET },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(401);
      },
    });
  });
});
