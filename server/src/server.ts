import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import helmet from "@fastify/helmet";
import supabasePlugin from "./plugins/supabase.js";
import { authRoutes } from "./routes/auth.js";
import { taskRoutes } from "./routes/tasks.js";
import { reasonRoutes } from "./routes/reasons.js";

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss" },
      },
    },
  });

  // Plugins
  await fastify.register(helmet);
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  });
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  });
  await fastify.register(supabasePlugin);

  // Routes
  await fastify.register(authRoutes);
  await fastify.register(taskRoutes);
  await fastify.register(reasonRoutes);

  // Health check
  fastify.get("/health", async () => ({ status: "ok" }));

  return fastify;
}

// Start server only when run directly (not during tests)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = Number(process.env.PORT ?? 3001);
  const server = await buildServer();

  try {
    await server.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}
