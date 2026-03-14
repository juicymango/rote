import { testApiHandler } from "next-test-api-route-handler";
import { GET, PUT, DELETE } from "../route";
import { faker } from "@faker-js/faker";

// Mock Prisma client
jest.mock("@/lib/prisma", () => ({
  content: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

describe("GET /api/content/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a specific piece of content for an authenticated user", async () => {
    const mockUser = { id: faker.string.uuid(), email: faker.internet.email() };
    const mockContent = {
      id: faker.string.uuid(),
      userId: mockUser.id,
      title: faker.lorem.sentence(),
      body: faker.lorem.paragraph(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.content.findUnique.mockResolvedValue(mockContent);

    await testApiHandler({
      appHandler: { GET },
      params: { id: mockContent.id },
      test: async ({ fetch }) => {
        const res = await fetch();
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.id).toBe(mockContent.id);
      },
    });
  });

  it("should return an error if the content does not exist", async () => {
    const mockUser = { id: faker.string.uuid(), email: faker.internet.email() };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.content.findUnique.mockRejectedValue(new Error("Not found"));

    await testApiHandler({
      appHandler: { GET },
      params: { id: "invalid-id" },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(500);
      },
    });
  });

  it("should return an error if the user is not the owner of the content", async () => {
    const mockUser = { id: faker.string.uuid(), email: faker.internet.email() };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.content.findUnique.mockRejectedValue(new Error("Not found"));

    await testApiHandler({
      appHandler: { GET },
      params: { id: faker.string.uuid() },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(500);
      },
    });
  });

  it("should return an error if the user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await testApiHandler({
      appHandler: { GET },
      params: { id: "test-id" },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(401);
      },
    });
  });
});

describe("PUT /api/content/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update a specific piece of content for an authenticated user", async () => {
    const mockUser = { id: faker.string.uuid(), email: faker.internet.email() };
    const newTitle = faker.lorem.sentence();
    const newBody = faker.lorem.paragraph();

    const mockUpdatedContent = {
      id: faker.string.uuid(),
      userId: mockUser.id,
      title: newTitle,
      body: newBody,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.content.update.mockResolvedValue(mockUpdatedContent);

    await testApiHandler({
      appHandler: { PUT },
      params: { id: mockUpdatedContent.id },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: newTitle, body: newBody }),
        });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.title).toBe(newTitle);
        expect(json.body).toBe(newBody);
      },
    });
  });
});

describe("DELETE /api/content/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a specific piece of content for an authenticated user", async () => {
    const mockUser = { id: faker.string.uuid(), email: faker.internet.email() };
    const contentId = faker.string.uuid();

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    prisma.content.delete.mockResolvedValue({ id: contentId });

    await testApiHandler({
      appHandler: { DELETE },
      params: { id: contentId },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "DELETE",
        });

        expect(res.status).toBe(204);
      },
    });
  });
});
