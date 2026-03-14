import { testApiHandler } from "next-test-api-route-handler";
import { GET } from "../today/route";
import { faker } from "@faker-js/faker";

// Mock Prisma client
jest.mock("@/lib/prisma", () => ({
  recitationProgress: {
    findMany: jest.fn(),
  },
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

describe("GET /api/recite/today", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a list of content to recite today for an authenticated user", async () => {
    const mockUser = { id: faker.string.uuid(), email: faker.internet.email() };
    const mockContent = {
      id: faker.string.uuid(),
      userId: mockUser.id,
      title: faker.lorem.sentence(),
      body: faker.lorem.paragraph(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockProgress = [
      {
        id: faker.string.uuid(),
        userId: mockUser.id,
        contentId: mockContent.id,
        content: mockContent,
        n: 0,
        ef: 2.5,
        i: 0,
        next_recite_at: new Date(),
        last_recited_at: new Date(),
      },
    ];

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.recitationProgress.findMany.mockResolvedValue(mockProgress);

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

  it("should return an empty list if there is no content to recite today", async () => {
    const mockUser = { id: faker.string.uuid(), email: faker.internet.email() };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.recitationProgress.findMany.mockResolvedValue([]);

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
