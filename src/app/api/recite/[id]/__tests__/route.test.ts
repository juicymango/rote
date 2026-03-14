import { testApiHandler } from "next-test-api-route-handler";
import { POST } from "../route";
import { faker } from "@faker-js/faker";

// Mock Prisma client
jest.mock("@/lib/prisma", () => ({
  recitationProgress: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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

describe("POST /api/recite/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should submit the result of a recitation for an authenticated user", async () => {
    const mockUser = { id: faker.string.uuid(), email: faker.internet.email() };
    const contentId = faker.string.uuid();

    const mockProgress = {
      id: faker.string.uuid(),
      userId: mockUser.id,
      contentId,
      n: 0,
      ef: 2.5,
      i: 0,
      next_recite_at: new Date(),
      last_recited_at: new Date(),
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.recitationProgress.findFirst.mockResolvedValue(mockProgress);
    prisma.recitationProgress.update.mockResolvedValue({ ...mockProgress, n: 1 });

    await testApiHandler({
      appHandler: { POST },
      params: { id: contentId },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: 4 }),
        });

        expect(res.status).toBe(200);

        expect(prisma.recitationProgress.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: mockProgress.id },
            data: expect.objectContaining({ n: 1 }),
          })
        );
      },
    });
  });

  it("should create a new recitation progress if it does not exist", async () => {
    const mockUser = { id: faker.string.uuid(), email: faker.internet.email() };
    const contentId = faker.string.uuid();

    const newProgress = {
      id: faker.string.uuid(),
      userId: mockUser.id,
      contentId,
      n: 0,
      ef: 2.5,
      i: 0,
      next_recite_at: new Date(),
      last_recited_at: new Date(),
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.recitationProgress.findFirst.mockResolvedValue(null);
    prisma.recitationProgress.create.mockResolvedValue(newProgress);
    prisma.recitationProgress.update.mockResolvedValue({ ...newProgress, n: 1 });

    await testApiHandler({
      appHandler: { POST },
      params: { id: contentId },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: 4 }),
        });

        expect(res.status).toBe(200);
        expect(prisma.recitationProgress.create).toHaveBeenCalled();
      },
    });
  });

  it("should update the recitation progress if it already exists", async () => {
    const mockUser = { id: faker.string.uuid(), email: faker.internet.email() };
    const contentId = faker.string.uuid();

    const existingProgress = {
      id: faker.string.uuid(),
      userId: mockUser.id,
      contentId,
      n: 1,
      ef: 2.5,
      i: 6,
      next_recite_at: new Date(),
      last_recited_at: new Date(),
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.recitationProgress.findFirst.mockResolvedValue(existingProgress);
    prisma.recitationProgress.update.mockResolvedValue({ ...existingProgress, n: 2 });

    await testApiHandler({
      appHandler: { POST },
      params: { id: contentId },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: 4 }),
        });

        expect(res.status).toBe(200);

        expect(prisma.recitationProgress.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: existingProgress.id },
            data: expect.objectContaining({ n: 2 }),
          })
        );
      },
    });
  });
});
