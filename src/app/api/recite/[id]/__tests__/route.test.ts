import { testApiHandler } from "next-test-api-route-handler";
import { POST } from "../route";
import { faker } from "@faker-js/faker";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";

// Mock the getServerSession function
jest.mock("next-auth");
const mockGetServerSession = getServerSession as jest.Mock;

describe("POST /api/recite/:id", () => {
  beforeEach(async () => {
    // Reset the database before each test
    await prisma.recitationProgress.deleteMany({});
    await prisma.content.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it("should submit the result of a recitation for an authenticated user", async () => {
    const user = await prisma.user.create({
      data: {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password_hash: faker.internet.password(),
      },
    });

    const content = await prisma.content.create({
      data: {
        title: faker.lorem.sentence(),
        body: faker.lorem.paragraph(),
        userId: user.id,
      },
    });

    mockGetServerSession.mockReturnValue(Promise.resolve({ user: { id: user.id } }));

    await testApiHandler({
      handler: POST,
      params: { id: content.id },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: 4 }),
        });

        // Check if the response is correct
        expect(res.status).toBe(200);

        // Check if the recitation progress is created in the database
        const progress = await prisma.recitationProgress.findFirst({
          where: {
            userId: user.id,
            contentId: content.id,
          },
        });
        expect(progress).not.toBeNull();
        expect(progress?.n).toBe(1);
      },
    });
  });

  it("should create a new recitation progress if it does not exist", async () => {
    const user = await prisma.user.create({
      data: {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password_hash: faker.internet.password(),
      },
    });

    const content = await prisma.content.create({
      data: {
        title: faker.lorem.sentence(),
        body: faker.lorem.paragraph(),
        userId: user.id,
      },
    });

    mockGetServerSession.mockReturnValue(Promise.resolve({ user: { id: user.id } }));

    await testApiHandler({
      handler: POST,
      params: { id: content.id },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: 4 }),
        });

        // Check if the response is correct
        expect(res.status).toBe(200);

        // Check if the recitation progress is created in the database
        const progress = await prisma.recitationProgress.findFirst({
          where: {
            userId: user.id,
            contentId: content.id,
          },
        });
        expect(progress).not.toBeNull();
      },
    });
  });

  it("should update the recitation progress if it already exists", async () => {
    const user = await prisma.user.create({
      data: {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password_hash: faker.internet.password(),
      },
    });

    const content = await prisma.content.create({
      data: {
        title: faker.lorem.sentence(),
        body: faker.lorem.paragraph(),
        userId: user.id,
      },
    });

    await prisma.recitationProgress.create({
      data: {
        userId: user.id,
        contentId: content.id,
        n: 1,
        ef: 2.5,
        i: 6,
        next_recite_at: new Date(),
        last_recited_at: new Date(),
      },
    });

    mockGetServerSession.mockReturnValue(Promise.resolve({ user: { id: user.id } }));

    await testApiHandler({
      handler: POST,
      params: { id: content.id },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: 4 }),
        });

        // Check if the response is correct
        expect(res.status).toBe(200);

        // Check if the recitation progress is updated in the database
        const progress = await prisma.recitationProgress.findFirst({
          where: {
            userId: user.id,
            contentId: content.id,
          },
        });
        expect(progress?.n).toBe(2);
      },
    });
  });
});
