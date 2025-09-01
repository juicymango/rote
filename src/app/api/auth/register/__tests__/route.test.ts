import { testApiHandler } from "next-test-api-route-handler";
import { POST } from "../route";
import { faker } from "@faker-js/faker";
import prisma from "@/lib/prisma";

describe("POST /api/auth/register", () => {
  beforeEach(async () => {
    // Reset the database before each test
    await prisma.user.deleteMany({});
  });

  it("should register a new user with valid data", async () => {
    const username = faker.internet.userName();
    const email = faker.internet.email();
    const password = faker.internet.password();

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

        // Check if the user is created in the database
        const user = await prisma.user.findUnique({ where: { email } });
        expect(user).not.toBeNull();
      },
    });
  });

  it("should return an error if the email is already taken", async () => {
    const email = faker.internet.email();
    // Create a user with the same email
    await prisma.user.create({
      data: {
        username: faker.internet.userName(),
        email,
        password_hash: faker.internet.password(),
      },
    });

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
    // Create a user with the same username
    await prisma.user.create({
      data: {
        username,
        email: faker.internet.email(),
        password_hash: faker.internet.password(),
      },
    });

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
