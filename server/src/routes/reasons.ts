import type { FastifyInstance } from "fastify";

export async function reasonRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ message: "Unauthorized" });
    }
  });

  // GET /reasons — return most-used completion reasons
  fastify.get("/reasons", async () => {
    const { data, error } = await fastify.supabase
      .from("completion_reasons")
      .select("*")
      .order("usage_count", { ascending: false })
      .limit(20);

    if (error) throw error;
    return data ?? [];
  });
}
