"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Task } from "@/types";
import { format, addDays, startOfWeek } from "date-fns";

type CopyMode = "day" | "week";

interface CopyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CopyMode;
  sourceDate?: string;      // for day copy: YYYY-MM-DD
  sourceWeekStart?: string; // for week copy: YYYY-MM-DD (Monday)
  onCopied: (tasks: Task[]) => void;
}

export function CopyModal({
  open,
  onOpenChange,
  mode,
  sourceDate,
  sourceWeekStart,
  onCopied,
}: CopyModalProps) {
  const [targetDate, setTargetDate] = useState("");
  const [targetWeekStart, setTargetWeekStart] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let tasks: Task[];
      if (mode === "day" && sourceDate && targetDate) {
        tasks = await api.tasks.copyDay(sourceDate, targetDate);
      } else if (mode === "week" && sourceWeekStart && targetWeekStart) {
        tasks = await api.tasks.copyWeek(sourceWeekStart, targetWeekStart);
      } else {
        return;
      }
      onCopied(tasks);
      setTargetDate("");
      setTargetWeekStart("");
      onOpenChange(false);
    } catch {
      setError("Failed to copy tasks.");
    } finally {
      setLoading(false);
    }
  }

  // Compute readable label for source
  const sourceLabel =
    mode === "day" && sourceDate
      ? format(new Date(sourceDate + "T00:00:00"), "EEEE, MMM d")
      : mode === "week" && sourceWeekStart
      ? `Week of ${format(new Date(sourceWeekStart + "T00:00:00"), "MMM d")} – ${format(
          addDays(new Date(sourceWeekStart + "T00:00:00"), 6),
          "MMM d"
        )}`
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Copy {mode}</DialogTitle>
          <DialogDescription>
            Copy all tasks from <strong>{sourceLabel}</strong> to a new {mode}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {mode === "day" ? (
            <div className="space-y-1.5">
              <Label htmlFor="target-date">Target date</Label>
              <Input
                id="target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                disabled={loading}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="target-week">Target week (any day in that week)</Label>
              <Input
                id="target-week"
                type="date"
                value={targetWeekStart}
                onChange={(e) => {
                  const monday = startOfWeek(new Date(e.target.value + "T00:00:00"), {
                    weekStartsOn: 1,
                  });
                  setTargetWeekStart(format(monday, "yyyy-MM-dd"));
                }}
                disabled={loading}
              />
              {targetWeekStart && (
                <p className="text-xs text-muted-foreground">
                  Week of{" "}
                  {format(new Date(targetWeekStart + "T00:00:00"), "MMM d")} –{" "}
                  {format(addDays(new Date(targetWeekStart + "T00:00:00"), 6), "MMM d")}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || (mode === "day" ? !targetDate : !targetWeekStart)}
            >
              {loading ? "Copying…" : "Copy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
