import type {
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  CompleteTaskPayload,
  ReorderPayload,
  CompletionReason,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("core_auth_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options?.headers },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      req<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
  },

  tasks: {
    list: (weekStart: string) =>
      req<Task[]>(`/tasks?week=${weekStart}`),

    create: (payload: CreateTaskPayload) =>
      req<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    update: (id: string, payload: UpdateTaskPayload) =>
      req<Task>(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),

    complete: (id: string, payload: CompleteTaskPayload) =>
      req<Task>(`/tasks/${id}/complete`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),

    reorder: (payload: ReorderPayload) =>
      req<void>("/tasks/reorder", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    delete: (id: string) =>
      req<void>(`/tasks/${id}`, { method: "DELETE" }),

    copyDay: (fromDate: string, toDate: string) =>
      req<Task[]>("/tasks/copy", {
        method: "POST",
        body: JSON.stringify({ from_date: fromDate, to_date: toDate }),
      }),

    copyWeek: (fromWeekStart: string, toWeekStart: string) =>
      req<Task[]>("/tasks/copy-week", {
        method: "POST",
        body: JSON.stringify({ from_week: fromWeekStart, to_week: toWeekStart }),
      }),
  },

  reasons: {
    list: () => req<CompletionReason[]>("/reasons"),
  },
};
