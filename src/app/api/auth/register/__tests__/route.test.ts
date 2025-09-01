import { testApiHandler } from "next-test-api-route-handler";
import { POST } from "../route";

describe("POST /api/auth/register", () => {
  it("should return a 200 and the new user", async () => {
    await testApiHandler({
      handler: POST,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username: "test", email: "test@example.com", password: "password" }),
        });
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json).toHaveProperty("id");
        expect(json.username).toBe("test");
        expect(json.email).toBe("test@example.com");
      },
    });
  });
});