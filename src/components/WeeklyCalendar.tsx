"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  format,
  addDays,
  startOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
} from "date-fns";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/TaskCard";
import { AddTaskModal } from "@/components/AddTaskModal";
import { EditTaskModal } from "@/components/EditTaskModal";
import { CompleteReasonModal } from "@/components/CompleteReasonModal";
import { CopyModal } from "@/components/CopyModal";
import { api } from "@/lib/api";
import type { Task } from "@/types";

export function WeeklyCalendar() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [addModal, setAddModal] = useState({ open: false, date: "" });
  const [editModal, setEditModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [completeModal, setCompleteModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [copyModal, setCopyModal] = useState<{
    open: boolean;
    mode: "day" | "week";
    sourceDate?: string;
    sourceWeekStart?: string;
  }>({ open: false, mode: "week" });

  // DnD state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [nestTargetId, setNestTargetId] = useState<string | null>(null);

  // Refs for drag intent tracking (don't need re-renders)
  const wasDraggingRef = useRef(false);
  const nestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNestIdRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekKey = format(weekStart, "yyyy-MM-dd");

  async function syncParentCompletion(allTasks: Task[]): Promise<Task[]> {
    const parentIds = [...new Set(allTasks.filter((t) => t.parent_id).map((t) => t.parent_id!))];
    let result = [...allTasks];
    for (const parentId of parentIds) {
      const parent = result.find((t) => t.id === parentId);
      if (!parent) continue;
      const subtasks = result.filter((t) => t.parent_id === parentId);
      if (subtasks.length === 0) continue;
      const allDone = subtasks.every((t) => t.completed);
      if (allDone && !parent.completed) {
        const now = new Date().toISOString();
        result = result.map((t) => t.id === parentId ? { ...t, completed: true, completed_at: now } : t);
        await api.tasks.update(parentId, { completed: true, completed_at: now });
      } else if (!allDone && parent.completed && !parent.completion_reason) {
        result = result.map((t) => t.id === parentId ? { ...t, completed: false, completed_at: undefined, completion_reason: undefined } : t);
        await api.tasks.update(parentId, { completed: false, completed_at: null, completion_reason: null });
      }
    }
    return result;
  }

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.tasks.list(weekKey);
      const synced = await syncParentCompletion(data);
      setTasks(synced);
    } catch {
      // server might not be running in dev without backend
    } finally {
      setLoading(false);
    }
  }, [weekKey]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  function getTopLevelTasksForDay(day: Date): Task[] {
    const dateStr = format(day, "yyyy-MM-dd");
    return tasks
      .filter((t) => t.date === dateStr && !t.parent_id)
      .sort((a, b) => a.position - b.position || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  function getSubtasks(parentId: string): Task[] {
    return tasks
      .filter((t) => t.parent_id === parentId)
      .sort((a, b) => a.position - b.position || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // ─── Task handlers ─────────────────────────────────────────────────────────

  function handleTaskCreated(task: Task) {
    setTasks((prev) => [...prev, task]);
  }

  function handleTaskUpdated(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }

  async function handleCompleteDirectly(task: Task) {
    const now = new Date().toISOString();
    const updated = tasks.map((t) => t.id === task.id ? { ...t, completed: true, completed_at: now } : t);
    setTasks(updated);
    try {
      await api.tasks.update(task.id, { completed: true, completed_at: now });
    } catch {
      loadTasks();
      return;
    }
    if (task.parent_id) await autoCompleteParent(task.parent_id, updated);
  }

  async function handleRevert(task: Task) {
    const updated = tasks.map((t) =>
      t.id === task.id ? { ...t, completed: false, completed_at: undefined, completion_reason: undefined } : t
    );
    setTasks(updated);
    try {
      await api.tasks.update(task.id, { completed: false, completed_at: null, completion_reason: null });
    } catch {
      loadTasks();
      return;
    }
    if (task.parent_id) await autoRevertParent(task.parent_id, updated);
  }

  function handleTaskCompleted(task: Task) {
    const updated = tasks.map((t) => t.id === task.id ? task : t);
    setTasks(updated);
    if (task.parent_id) autoCompleteParent(task.parent_id, updated);
  }

  async function autoCompleteParent(parentId: string, currentTasks: Task[]) {
    const parent = currentTasks.find((t) => t.id === parentId);
    if (!parent || parent.completed) return;
    const subtasks = currentTasks.filter((t) => t.parent_id === parentId);
    if (subtasks.length === 0 || !subtasks.every((t) => t.completed)) return;
    const now = new Date().toISOString();
    setTasks((prev) => prev.map((t) => t.id === parentId ? { ...t, completed: true, completed_at: now } : t));
    try {
      await api.tasks.update(parentId, { completed: true, completed_at: now });
    } catch {
      loadTasks();
    }
  }

  async function autoRevertParent(parentId: string, currentTasks: Task[]) {
    const parent = currentTasks.find((t) => t.id === parentId);
    // Only auto-revert if it was auto-completed (no manual reason)
    if (!parent || !parent.completed || parent.completion_reason) return;
    setTasks((prev) =>
      prev.map((t) => t.id === parentId ? { ...t, completed: false, completed_at: undefined, completion_reason: undefined } : t)
    );
    try {
      await api.tasks.update(parentId, { completed: false, completed_at: null, completion_reason: null });
    } catch {
      loadTasks();
    }
  }

  function handleTaskDeleted(taskId: string) {
    // Also remove subtasks of a deleted parent
    setTasks((prev) => prev.filter((t) => t.id !== taskId && t.parent_id !== taskId));
  }

  async function handleTaskDeleteFromList(taskId: string) {
    handleTaskDeleted(taskId);
    try {
      await api.tasks.delete(taskId);
    } catch {
      loadTasks();
    }
  }

  async function handleUnNest(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task?.parent_id) return;
    const parent = tasks.find((t) => t.id === task.parent_id);
    if (!parent) return;

    const dayTopLevel = tasks.filter(
      (t) => t.date === parent.date && !t.parent_id
    );
    const newPosition = dayTopLevel.length;

    setTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, parent_id: undefined, position: newPosition } : t)
    );
    try {
      await api.tasks.update(taskId, { parent_id: null, position: newPosition });
    } catch {
      loadTasks();
    }
  }

  function handleCopied(newTasks: Task[]) {
    setTasks((prev) => [...prev, ...newTasks]);
  }

  function openEdit(task: Task) {
    if (wasDraggingRef.current) return;
    setEditModal({ open: true, task });
  }

  // ─── DnD helpers ───────────────────────────────────────────────────────────

  function clearNestTimer() {
    if (nestTimerRef.current) {
      clearTimeout(nestTimerRef.current);
      nestTimerRef.current = null;
    }
    pendingNestIdRef.current = null;
  }

  // ─── DnD handlers ──────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    setDraggingId(String(active.id));
    setNestTargetId(null);
    wasDraggingRef.current = true;
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || String(over.id) === String(active.id)) {
      clearNestTimer();
      setNestTargetId(null);
      return;
    }

    const overTask = tasks.find((t) => t.id === String(over.id));
    const activeTask = tasks.find((t) => t.id === String(active.id));

    // Only allow nesting top-level tasks into other top-level tasks
    if (!overTask || !activeTask || activeTask.parent_id || overTask.parent_id) {
      clearNestTimer();
      setNestTargetId(null);
      return;
    }

    const activeRect = (active.rect as { current: { translated: DOMRect | null } }).current.translated;
    const overRect = over.rect as DOMRect;

    if (activeRect && overRect) {
      // Require the dragged card to physically overlap the target card
      const overlaps =
        activeRect.left < overRect.right &&
        activeRect.right > overRect.left &&
        activeRect.top < overRect.bottom &&
        activeRect.bottom > overRect.top;

      if (!overlaps) {
        clearNestTimer();
        setNestTargetId(null);
        return;
      }

      // Within the overlap, only nest when the active card's center is in the bottom half
      const activeCenterY = activeRect.top + activeRect.height / 2;
      const nestThreshold = overRect.top + overRect.height * 0.5;

      if (activeCenterY > nestThreshold) {
        const overId = String(over.id);
        if (pendingNestIdRef.current !== overId) {
          clearNestTimer();
          pendingNestIdRef.current = overId;
          nestTimerRef.current = setTimeout(() => {
            setNestTargetId(overId);
          }, 400);
        }
      } else {
        clearNestTimer();
        setNestTargetId(null);
      }
    }
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    const currentNestTarget = nestTargetId;
    clearNestTimer();
    const activeId = String(active.id);

    setDraggingId(null);
    setNestTargetId(null);
    // Keep wasDragging true past the click event that fires after pointerup
    setTimeout(() => { wasDraggingRef.current = false; }, 50);

    if (!over) return;
    const overId = String(over.id);

    if (currentNestTarget && currentNestTarget !== activeId) {
      await doNest(activeId, currentNestTarget);
      return;
    }

    if (activeId !== overId) {
      await doReorder(activeId, overId);
    }
  }

  async function doNest(taskId: string, parentId: string) {
    const subCount = tasks.filter((t) => t.parent_id === parentId).length;

    setTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, parent_id: parentId, position: subCount } : t)
    );
    try {
      await api.tasks.update(taskId, { parent_id: parentId, position: subCount });
    } catch {
      loadTasks();
    }
  }

  async function doReorder(activeId: string, overId: string) {
    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const scopeTasks = tasks
      .filter((t) => t.date === activeTask.date && t.parent_id === activeTask.parent_id)
      .sort((a, b) => a.position - b.position || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const oldIndex = scopeTasks.findIndex((t) => t.id === activeId);
    const newIndex = scopeTasks.findIndex((t) => t.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(scopeTasks, oldIndex, newIndex);
    const updates = reordered.map((t, i) => ({ id: t.id, position: i }));

    setTasks((prev) =>
      prev.map((t) => {
        const u = updates.find((u) => u.id === t.id);
        return u ? { ...t, position: u.position } : t;
      })
    );
    try {
      await api.tasks.reorder({ updates });
    } catch {
      loadTasks();
    }
  }

  const draggingTask = draggingId ? tasks.find((t) => t.id === draggingId) ?? null : null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* Week navigation header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">
            {format(weekStart, "MMM d")} –{" "}
            {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </h2>
          <button
            onClick={() => setWeekStart((w) => subWeeks(w, 1))}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-secondary transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="text-xs text-muted-foreground"
          >
            Today
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setCopyModal({ open: true, mode: "week", sourceWeekStart: weekKey })
          }
          className="gap-1.5 text-xs"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy week
        </Button>
      </div>

      {/* Calendar grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex border-b border-border">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const dateStr = format(day, "yyyy-MM-dd");
            const dayTasks = getTopLevelTasksForDay(day);

            return (
              <div
                key={dateStr}
                className="flex flex-1 min-w-0 flex-col border-r border-border last:border-r-0"
              >
                {/* Day header */}
                <div
                  className={`relative flex h-12 shrink-0 flex-col items-center justify-center border-b border-border group ${
                    isToday ? "bg-primary text-primary-foreground" : "bg-card"
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">
                    {format(day, "EEE")}
                  </span>
                  <span className={`text-sm font-semibold ${isToday ? "" : "text-foreground"}`}>
                    {format(day, "d")}
                  </span>
                  <button
                    onClick={() => setAddModal({ open: true, date: dateStr })}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity"
                    title="Add task"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Task list */}
                <SortableContext
                  items={dayTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-1.5 p-1.5 min-h-[3rem]">
                    {dayTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        subtasks={getSubtasks(task.id)}
                        isNestTarget={nestTargetId === task.id}
                        onCardClick={openEdit}
                        onCompleteDirectly={handleCompleteDirectly}
                        onCompleteWithReason={(t) => setCompleteModal({ open: true, task: t })}
                        onUnNest={handleUnNest}
                        onRevert={handleRevert}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {draggingTask && (
            <TaskCard
              task={draggingTask}
              subtasks={[]}
              isNestTarget={false}
              isOverlay
              onCardClick={() => {}}
              onCompleteDirectly={() => {}}
              onCompleteWithReason={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      )}

      <AddTaskModal
        open={addModal.open}
        onOpenChange={(open) => setAddModal((m) => ({ ...m, open }))}
        date={addModal.date}
        onCreated={handleTaskCreated}
      />

      <EditTaskModal
        open={editModal.open}
        onOpenChange={(open) => setEditModal((m) => ({ ...m, open }))}
        task={editModal.task}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
      />

      <CompleteReasonModal
        open={completeModal.open}
        onOpenChange={(open) => setCompleteModal((m) => ({ ...m, open }))}
        task={completeModal.task}
        onCompleted={handleTaskCompleted}
      />

      <CopyModal
        open={copyModal.open}
        onOpenChange={(open) => setCopyModal((m) => ({ ...m, open }))}
        mode={copyModal.mode}
        sourceDate={copyModal.sourceDate}
        sourceWeekStart={copyModal.sourceWeekStart}
        onCopied={handleCopied}
      />
    </div>
  );
}
