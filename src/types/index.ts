export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string; // "YYYY-MM-DD"
  start_time?: string; // "HH:MM"
  end_time?: string; // "HH:MM"
  position: number;
  parent_id?: string;
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

export interface CreateTaskPayload {
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  parent_id?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  date?: string;
  start_time?: string | null;
  end_time?: string | null;
  position?: number;
  parent_id?: string | null;
  completed?: boolean;
  completed_at?: string | null;
  completion_reason?: string | null;
}

export interface CompleteTaskPayload {
  reason: string;
}

export interface ReorderPayload {
  updates: { id: string; position: number }[];
}
