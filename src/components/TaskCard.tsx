"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, CornerUpLeft, RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

// ─── Subtask row ──────────────────────────────────────────────────────────────

interface SubtaskRowProps {
  task: Task;
  onCardClick: (task: Task) => void;
  onCompleteDirectly: (task: Task) => void;
  onCompleteWithReason: (task: Task) => void;
  onUnNest: (taskId: string) => void;
  onRevert: (task: Task) => void;
}

function SubtaskRow({ task, onCardClick, onCompleteDirectly, onCompleteWithReason, onUnNest, onRevert }: SubtaskRowProps) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onCardClick(task); }}
      className={cn(
        "rounded border px-2 py-1 text-xs flex items-start gap-1.5 cursor-pointer",
        task.completed
          ? task.completion_reason
            ? "border-red-200 bg-red-50/50 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
            : "border-green-200 bg-green-50/50 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
          : "border-border bg-background text-foreground hover:bg-secondary/50 transition-colors"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium leading-snug", task.completed && (task.completion_reason ? "line-through opacity-70" : "opacity-60"))}>
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 text-foreground/70 line-clamp-1">{task.description}</p>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0 mt-px">
        {task.completed ? (
          <button
            onClick={(e) => { e.stopPropagation(); onRevert(task); }}
            className="flex h-4 w-4 items-center justify-center rounded opacity-40 hover:opacity-100 transition-opacity"
            title="Revert to pending"
          >
            <RotateCcw className="h-2.5 w-2.5" />
          </button>
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onUnNest(task.id); }}
              className="flex h-4 w-4 items-center justify-center rounded opacity-40 hover:opacity-100 transition-opacity"
              title="Move to top level"
            >
              <CornerUpLeft className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCompleteWithReason(task); }}
              className="flex h-4 w-4 items-center justify-center rounded opacity-40 hover:opacity-100 hover:text-destructive transition-opacity"
              title="Complete with reason"
            >
              <XCircle className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCompleteDirectly(task); }}
              className="flex h-4 w-4 items-center justify-center rounded opacity-40 hover:opacity-100 hover:text-green-600 transition-opacity"
              title="Mark complete"
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  subtasks: Task[];
  isNestTarget: boolean;
  isOverlay?: boolean;
  onCardClick: (task: Task) => void;
  onCompleteDirectly: (task: Task) => void;
  onCompleteWithReason: (task: Task) => void;
  onUnNest?: (taskId: string) => void;
  onRevert?: (task: Task) => void;
}

export function TaskCard({
  task,
  subtasks,
  isNestTarget,
  isOverlay = false,
  onCardClick,
  onCompleteDirectly,
  onCompleteWithReason,
  onUnNest,
  onRevert,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isOverlay,
  });

  const style = isOverlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  const timeLabel = task.start_time
    ? task.end_time
      ? `${task.start_time} – ${task.end_time}`
      : task.start_time
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isOverlay) onCardClick(task); }}
      className={cn(
        "rounded-md border text-xs flex flex-col shadow-sm transition-all select-none",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        isNestTarget && "ring-2 ring-primary ring-offset-1",
        task.completed
          ? task.completion_reason
            ? "border-red-300 bg-red-100 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300"
            : "border-green-300 bg-completed text-completed-foreground"
          : "border-pending-border bg-pending text-foreground hover:shadow-md",
        isOverlay && "shadow-lg rotate-1 cursor-grabbing"
      )}
    >
      {/* Main content */}
      <div className="flex items-start justify-between gap-1 px-2 py-1.5">
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium leading-tight", task.completed && (task.completion_reason ? "line-through opacity-70" : "opacity-60"))}>
            {task.title}
          </p>
          {task.description && (
            <p className="mt-0.5 text-foreground/70 line-clamp-2 leading-snug">{task.description}</p>
          )}
          {timeLabel && (
            <span className="mt-1 inline-block rounded bg-secondary px-1.5 py-px text-[10px] font-medium text-muted-foreground">
              {timeLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0 mt-px">
          {task.completed ? (
            <button
              onClick={(e) => { e.stopPropagation(); onRevert?.(task); }}
              className="flex h-5 w-5 items-center justify-center rounded opacity-30 hover:opacity-100 transition-opacity"
              title="Revert to pending"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onCompleteWithReason(task); }}
                className="flex h-5 w-5 items-center justify-center rounded opacity-30 hover:opacity-100 hover:text-destructive transition-opacity"
                title="Complete with reason"
              >
                <XCircle className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onCompleteDirectly(task); }}
                className="flex h-5 w-5 items-center justify-center rounded opacity-30 hover:opacity-100 hover:text-green-700 transition-opacity"
                title="Mark complete"
              >
                <CheckCircle2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Nesting hint */}
      {isNestTarget && (
        <div className="px-2 pb-1.5 text-[10px] text-primary font-medium opacity-80">
          Drop to nest as subtask
        </div>
      )}

      {/* Subtask list */}
      {subtasks.length > 0 && (
        <div className="px-2 pb-1.5 flex flex-col gap-1">
          {subtasks.map((sub) => (
            <SubtaskRow
              key={sub.id}
              task={sub}
              onCardClick={onCardClick}
              onCompleteDirectly={onCompleteDirectly}
              onCompleteWithReason={onCompleteWithReason}
              onUnNest={onUnNest ?? (() => {})}
              onRevert={onRevert ?? (() => {})}
            />
          ))}
        </div>
      )}
    </div>
  );
}
