import type { FastifyInstance } from "fastify";

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: { username: string; password: string };
  }>(
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string" },
            password: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: { token: { type: "string" } },
          },
          401: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body;

      const validUsername = process.env.AUTH_USERNAME ?? "leandrin";
      const validPassword = process.env.AUTH_PASSWORD ?? "c0r31n1122";

      if (username !== validUsername || password !== validPassword) {
        return reply.status(401).send({ message: "Invalid credentials" });
      }

      const token = fastify.jwt.sign({ sub: username }, { expiresIn: "7d" });
      return { token };
    }
  );
}
