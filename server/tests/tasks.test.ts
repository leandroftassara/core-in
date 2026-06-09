import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "../src/server.js";
import type { FastifyInstance } from "fastify";

// Mock Supabase so tests don't need a real DB
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        gte: () => ({ lte: () => ({ order: () => ({ data: mockTasks, error: null }) }) }),
        eq: () => ({ data: mockTasks, error: null }),
      }),
      insert: (rows: unknown[]) => ({
        select: () => ({
          single: () => ({ data: { ...mockTasks[0], ...(rows as object[])[0] }, error: null }),
          data: (rows as object[]).map((r, i) => ({ id: `new-${i}`, ...r })),
          error: null,
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => ({
              data: { ...mockTasks[0], completed: true, completion_reason: "done" },
              error: null,
            }),
          }),
        }),
      }),
      delete: () => ({ eq: () => ({ error: null }) }),
    }),
    rpc: () => ({ error: null }),
  }),
}));

const mockTasks = [
  {
    id: "task-1",
    title: "Morning standup",
    date: "2026-06-08",
    start_time: "09:00",
    end_time: "09:30",
    completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let app: FastifyInstance;
let authToken: string;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();

  const loginRes = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { username: "leandrin", password: "c0r31n1122" },
  });
  authToken = loginRes.json<{ token: string }>().token;
});

afterAll(async () => {
  await app.close();
});

describe("GET /tasks", () => {
  it("requires auth", async () => {
    const res = await app.inject({ method: "GET", url: "/tasks" });
    expect(res.statusCode).toBe(401);
  });

  it("returns tasks for the week", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/tasks?week=2026-06-08",
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<unknown[]>();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /tasks", () => {
  it("creates a task", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/tasks",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        title: "New task",
        date: "2026-06-08",
        start_time: "10:00",
        end_time: "11:00",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<{ title: string }>();
    expect(body.title).toBeDefined();
  });

  it("rejects missing title", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/tasks",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { date: "2026-06-08", start_time: "10:00" },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("PATCH /tasks/:id/complete", () => {
  it("marks a task complete with a reason", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/tasks/task-1/complete",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { reason: "Finished early" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ completed: boolean }>();
    expect(body.completed).toBe(true);
  });
});

describe("DELETE /tasks/:id", () => {
  it("deletes a task", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/tasks/task-1",
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(204);
  });
});
