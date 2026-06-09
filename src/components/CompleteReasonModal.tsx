"use client";

import { useState, useEffect } from "react";
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
import type { Task, CompletionReason } from "@/types";

interface CompleteReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onCompleted: (task: Task) => void;
}

export function CompleteReasonModal({
  open,
  onOpenChange,
  task,
  onCompleted,
}: CompleteReasonModalProps) {
  const [reason, setReason] = useState("");
  const [suggestions, setSuggestions] = useState<CompletionReason[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      api.reasons.list().then(setSuggestions).catch(() => {});
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !reason.trim()) return;
    setLoading(true);
    setError("");

    try {
      const updated = await api.tasks.complete(task.id, { reason: reason.trim() });
      onCompleted(updated);
      setReason("");
      onOpenChange(false);
    } catch {
      setError("Failed to mark task as complete.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as complete</DialogTitle>
          <DialogDescription>
            Why are you marking &ldquo;{task?.title}&rdquo; as done?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Finished ahead of schedule"
              autoFocus
              disabled={loading}
              list="reason-suggestions"
            />
            {suggestions.length > 0 && (
              <datalist id="reason-suggestions">
                {suggestions.map((s) => (
                  <option key={s.id} value={s.reason} />
                ))}
              </datalist>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Recent reasons</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setReason(s.reason)}
                    className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground hover:bg-accent transition-colors"
                  >
                    {s.reason}
                  </button>
                ))}
              </div>
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
            <Button type="submit" disabled={loading || !reason.trim()}>
              {loading ? "Saving…" : "Complete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
