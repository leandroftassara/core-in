import Fastify from "fastify";
import fp from "fastify-plugin";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

declare module "fastify" {
  interface FastifyInstance {
    supabase: SupabaseClient;
  }
}

async function supabasePlugin(fastify: ReturnType<typeof Fastify>) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    fastify.log.warn(
      "SUPABASE_URL or SUPABASE_SERVICE_KEY not set — Supabase plugin disabled"
    );
    // Decorate with a stub so routes don't crash on import
    fastify.decorate("supabase", null as unknown as SupabaseClient);
    return;
  }

  const client = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { transport: ws },
  });

  fastify.decorate("supabase", client);
}

export default fp(supabasePlugin, { name: "supabase" });
