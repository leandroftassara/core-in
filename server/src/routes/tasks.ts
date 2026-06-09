import type { FastifyInstance } from "fastify";
import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  parseISO,
} from "date-fns";

export async function taskRoutes(fastify: FastifyInstance) {
  // All task routes require auth
  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ message: "Unauthorized" });
    }
  });

  // GET /tasks?week=YYYY-MM-DD
  fastify.get<{ Querystring: { week?: string } }>("/tasks", async (request) => {
    const weekParam = request.query.week ?? format(new Date(), "yyyy-MM-dd");
    const weekStart = startOfWeek(parseISO(weekParam), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const { data, error } = await fastify.supabase
      .from("tasks")
      .select("*")
      .gte("date", format(weekStart, "yyyy-MM-dd"))
      .lte("date", format(weekEnd, "yyyy-MM-dd"))
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  });

  // POST /tasks
  fastify.post<{
    Body: {
      title: string;
      description?: string;
      date: string;
      start_time?: string;
      end_time?: string;
      parent_id?: string;
    };
  }>(
    "/tasks",
    {
      schema: {
        body: {
          type: "object",
          required: ["title", "date"],
          properties: {
            title: { type: "string", minLength: 1 },
            description: { type: "string" },
            date: { type: "string" },
            start_time: { type: "string" },
            end_time: { type: "string" },
            parent_id: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { title, description, date, start_time, end_time, parent_id } = request.body;

      // Assign position = count of existing tasks in the same scope
      const posQuery = fastify.supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("date", date);

      if (parent_id) {
        posQuery.eq("parent_id", parent_id);
      } else {
        posQuery.is("parent_id", null);
      }

      const { count } = await posQuery;
      const position = count ?? 0;

      const payload: Record<string, unknown> = { title, date, position };
      if (description) payload.description = description;
      if (start_time) payload.start_time = start_time;
      if (end_time) payload.end_time = end_time;
      if (parent_id) payload.parent_id = parent_id;

      const { data, error } = await fastify.supabase
        .from("tasks")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return reply.status(201).send(data);
    }
  );

  // POST /tasks/reorder — bulk update positions
  fastify.post<{
    Body: { updates: { id: string; position: number }[] };
  }>(
    "/tasks/reorder",
    {
      schema: {
        body: {
          type: "object",
          required: ["updates"],
          properties: {
            updates: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "position"],
                properties: {
                  id: { type: "string" },
                  position: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { updates } = request.body;
      const now = new Date().toISOString();

      for (const { id, position } of updates) {
        const { error } = await fastify.supabase
          .from("tasks")
          .update({ position, updated_at: now })
          .eq("id", id);
        if (error) throw error;
      }

      return reply.status(204).send();
    }
  );

  // PATCH /tasks/:id/complete
  fastify.patch<{
    Params: { id: string };
    Body: { reason: string };
  }>(
    "/tasks/:id/complete",
    {
      schema: {
        body: {
          type: "object",
          required: ["reason"],
          properties: { reason: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { reason } = request.body;

      const { data, error } = await fastify.supabase
        .from("tasks")
        .update({
          completed: true,
          completion_reason: reason,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await fastify.supabase.rpc("upsert_completion_reason", { p_reason: reason });

      return data;
    }
  );

  // PATCH /tasks/:id
  fastify.patch<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string | null;
      date?: string;
      start_time?: string | null;
      end_time?: string | null;
      position?: number;
      parent_id?: string | null;
      completed?: boolean;
      completed_at?: string | null;
    };
  }>(
    "/tasks/:id",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 1 },
            description: { type: ["string", "null"] },
            date: { type: "string" },
            start_time: { type: ["string", "null"] },
            end_time: { type: ["string", "null"] },
            position: { type: "number" },
            parent_id: { type: ["string", "null"] },
            completed: { type: "boolean" },
            completed_at: { type: ["string", "null"] },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body;

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.title !== undefined) patch.title = body.title;
      if ("description" in body) patch.description = body.description ?? null;
      if (body.date !== undefined) patch.date = body.date;
      if ("start_time" in body) patch.start_time = body.start_time ?? null;
      if ("end_time" in body) patch.end_time = body.end_time ?? null;
      if (body.position !== undefined) patch.position = body.position;
      if ("parent_id" in body) patch.parent_id = body.parent_id ?? null;
      if (body.completed !== undefined) patch.completed = body.completed;
      if ("completed_at" in body) patch.completed_at = body.completed_at ?? null;

      const { data, error } = await fastify.supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  );

  // DELETE /tasks/:id
  fastify.delete<{ Params: { id: string } }>("/tasks/:id", async (request, reply) => {
    const { id } = request.params;

    const { error } = await fastify.supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;

    return reply.status(204).send();
  });

  // POST /tasks/copy — copy one day to another
  fastify.post<{
    Body: { from_date: string; to_date: string };
  }>(
    "/tasks/copy",
    {
      schema: {
        body: {
          type: "object",
          required: ["from_date", "to_date"],
          properties: {
            from_date: { type: "string" },
            to_date: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { from_date, to_date } = request.body;

      const { data: sourceTasks, error: fetchError } = await fastify.supabase
        .from("tasks")
        .select("title, description, start_time, end_time, position")
        .eq("date", from_date)
        .is("parent_id", null);

      if (fetchError) throw fetchError;
      if (!sourceTasks?.length) return reply.status(200).send([]);

      const newTasks = sourceTasks.map((t) => ({
        title: t.title,
        description: t.description,
        date: to_date,
        start_time: t.start_time,
        end_time: t.end_time,
        position: t.position,
      }));

      const { data, error } = await fastify.supabase
        .from("tasks")
        .insert(newTasks)
        .select();

      if (error) throw error;
      return reply.status(201).send(data ?? []);
    }
  );

  // POST /tasks/copy-week — copy an entire week to another week
  fastify.post<{
    Body: { from_week: string; to_week: string };
  }>(
    "/tasks/copy-week",
    {
      schema: {
        body: {
          type: "object",
          required: ["from_week", "to_week"],
          properties: {
            from_week: { type: "string" },
            to_week: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { from_week, to_week } = request.body;

      const fromStart = startOfWeek(parseISO(from_week), { weekStartsOn: 1 });
      const fromEnd = endOfWeek(fromStart, { weekStartsOn: 1 });
      const toStart = startOfWeek(parseISO(to_week), { weekStartsOn: 1 });
      const dayOffset =
        (toStart.getTime() - fromStart.getTime()) / (1000 * 60 * 60 * 24);

      const { data: sourceTasks, error: fetchError } = await fastify.supabase
        .from("tasks")
        .select("title, description, date, start_time, end_time, position")
        .gte("date", format(fromStart, "yyyy-MM-dd"))
        .lte("date", format(fromEnd, "yyyy-MM-dd"))
        .is("parent_id", null);

      if (fetchError) throw fetchError;
      if (!sourceTasks?.length) return reply.status(200).send([]);

      const newTasks = sourceTasks.map((t) => ({
        title: t.title,
        description: t.description,
        date: format(addDays(parseISO(t.date), dayOffset), "yyyy-MM-dd"),
        start_time: t.start_time,
        end_time: t.end_time,
        position: t.position,
      }));

      const { data, error } = await fastify.supabase
        .from("tasks")
        .insert(newTasks)
        .select();

      if (error) throw error;
      return reply.status(201).send(data ?? []);
    }
  );
}
