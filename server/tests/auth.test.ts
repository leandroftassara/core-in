import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("POST /auth/login", () => {
  it("returns a JWT token with valid credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "leandrin", password: "c0r31n1122" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ token: string }>();
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe("string");
    expect(body.token.split(".")).toHaveLength(3); // valid JWT structure
  });

  it("returns 401 with wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "leandrin", password: "wrongpassword" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<{ message: string }>().message).toBe("Invalid credentials");
  });

  it("returns 401 with wrong username", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "hacker", password: "c0r31n1122" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 400 when body fields are missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "leandrin" },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ status: string }>().status).toBe("ok");
  });
});
