import { testApiHandler } from "next-test-api-route-handler";
import { GET } from "../../today/route";
import { faker } from "@faker-js/faker";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";

// Mock the getServerSession function
jest.mock("next-auth");
const mockGetServerSession = getServerSession as jest.Mock;

describe("GET /api/recite/today", () => {
  beforeEach(async () => {
    // Reset the database before each test
    await prisma.recitationProgress.deleteMany({});
    await prisma.content.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it("should return a list of content to recite today for an authenticated user", async () => {
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
        n: 0,
        ef: 2.5,
        i: 0,
        next_recite_at: new Date(),
        last_recited_at: new Date(),
      },
    });

    mockGetServerSession.mockReturnValue(Promise.resolve({ user: { id: user.id } }));

    await testApiHandler({
      handler: GET,
      test: async ({ fetch }) => {
        const res = await fetch();
        const json = await res.json();

        // Check if the response is correct
        expect(res.status).toBe(200);
        expect(json.length).toBe(1);
      },
    });
  });

  it("should return an empty list if there is no content to recite today", async () => {
    const user = await prisma.user.create({
      data: {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password_hash: faker.internet.password(),
      },
    });

    mockGetServerSession.mockReturnValue(Promise.resolve({ user: { id: user.id } }));

    await testApiHandler({
      handler: GET,
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
      handler: GET,
      test: async ({ fetch }) => {
        const res = await fetch();

        // Check if the response is correct
        expect(res.status).toBe(401);
      },
    });
  });
});
