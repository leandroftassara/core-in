export interface Task {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time?: string;
  completed: boolean;
  completion_reason?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CompletionReason {
  id: string;
  reason: string;
  usage_count: number;
  last_used_at: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: { sub: string };
  }
}
