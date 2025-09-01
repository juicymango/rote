import { testApiHandler } from "next-test-api-route-handler";
import { GET, PUT, DELETE } from "../route";
import { faker } from "@faker-js/faker";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";

// Mock the getServerSession function
jest.mock("next-auth");
const mockGetServerSession = getServerSession as jest.Mock;

describe("GET /api/content/:id", () => {
  beforeEach(async () => {
    // Reset the database before each test
    await prisma.content.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it("should return a specific piece of content for an authenticated user", async () => {
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
      handler: GET,
      params: { id: content.id },
      test: async ({ fetch }) => {
        const res = await fetch();
        const json = await res.json();

        // Check if the response is correct
        expect(res.status).toBe(200);
        expect(json.id).toBe(content.id);
      },
    });
  });

  it("should return an error if the content does not exist", async () => {
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
      params: { id: "invalid-id" },
      test: async ({ fetch }) => {
        const res = await fetch();

        // Check if the response is correct
        expect(res.status).toBe(500);
      },
    });
  });

  it("should return an error if the user is not the owner of the content", async () => {
    const user1 = await prisma.user.create({
      data: {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password_hash: faker.internet.password(),
      },
    });

    const user2 = await prisma.user.create({
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
        userId: user1.id,
      },
    });

    mockGetServerSession.mockReturnValue(Promise.resolve({ user: { id: user2.id } }));

    await testApiHandler({
      handler: GET,
      params: { id: content.id },
      test: async ({ fetch }) => {
        const res = await fetch();

        // Check if the response is correct
        expect(res.status).toBe(500);
      },
    });
  });

  it("should return an error if the user is not authenticated", async () => {
    mockGetServerSession.mockReturnValue(Promise.resolve(null));

    await testApiHandler({
      handler: GET,
      params: { id: "test-id" },
      test: async ({ fetch }) => {
        const res = await fetch();

        // Check if the response is correct
        expect(res.status).toBe(401);
      },
    });
  });
});

describe("PUT /api/content/:id", () => {
  beforeEach(async () => {
    // Reset the database before each test
    await prisma.content.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it("should update a specific piece of content for an authenticated user", async () => {
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

    const newTitle = faker.lorem.sentence();
    const newBody = faker.lorem.paragraph();

    await testApiHandler({
      handler: PUT,
      params: { id: content.id },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: newTitle, body: newBody }),
        });
        const json = await res.json();

        // Check if the response is correct
        expect(res.status).toBe(200);
        expect(json.title).toBe(newTitle);
        expect(json.body).toBe(newBody);

        // Check if the content is updated in the database
        const updatedContent = await prisma.content.findUnique({ where: { id: content.id } });
        expect(updatedContent?.title).toBe(newTitle);
        expect(updatedContent?.body).toBe(newBody);
      },
    });
  });
});

describe("DELETE /api/content/:id", () => {
  beforeEach(async () => {
    // Reset the database before each test
    await prisma.content.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it("should delete a specific piece of content for an authenticated user", async () => {
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
      handler: DELETE,
      params: { id: content.id },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "DELETE",
        });

        // Check if the response is correct
        expect(res.status).toBe(204);

        // Check if the content is deleted from the database
        const deletedContent = await prisma.content.findUnique({ where: { id: content.id } });
        expect(deletedContent).toBeNull();
      },
    });
  });
});
