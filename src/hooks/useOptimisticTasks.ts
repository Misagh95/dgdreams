"use client";

import { useState, useCallback, useRef } from "react";

type TaskId = "checkIn" | "gm" | "gn";

type TaskState = "idle" | "pending" | "confirmed" | "failed";

interface TaskEntry {
  state: TaskState;
  txHash?: string;
  startedAt: number;
}

interface OptimisticTasksReturn {
  /** Tasks currently in-flight (submitted but not confirmed) */
  pendingTasks: Set<TaskId>;
  /** All tasks with their optimistic state */
  taskStates: Record<TaskId, TaskEntry>;
  /** Optimistic action count = confirmed on-chain count + pending tasks */
  optimisticActionCount: (actualCount: number) => number;
  /** Whether a specific task should show as "in progress" */
  isTaskPending: (taskId: TaskId) => boolean;
  /** Whether a specific task should show as "completed" (confirmed or already done on-chain) */
  isTaskCompleted: (taskId: TaskId, alreadyDoneOnChain: boolean) => boolean;
  /** Mark a task as submitted (optimistic "in progress") */
  markTaskPending: (taskId: TaskId, txHash?: string) => void;
  /** Mark a task as confirmed on-chain */
  markTaskConfirmed: (taskId: TaskId) => void;
  /** Mark a task as failed */
  markTaskFailed: (taskId: TaskId, error?: string) => void;
  /** Reset all optimistic state (e.g. on network switch) */
  resetAll: () => void;
  /** Get the optimistic completed task IDs (for DailyMissionDeck) */
  getOptimisticCompletedIds: (onChainCompleted: Set<string>) => Set<string>;
}

const ALL_TASKS: TaskId[] = ["checkIn", "gm", "gn"];

export function useOptimisticTasks(): OptimisticTasksReturn {
  const [taskStates, setTaskStates] = useState<Record<TaskId, TaskEntry>>({
    checkIn: { state: "idle", startedAt: 0 },
    gm: { state: "idle", startedAt: 0 },
    gn: { state: "idle", startedAt: 0 },
  });

  const pendingTasks = new Set<TaskId>(
    ALL_TASKS.filter((id) => taskStates[id].state === "pending")
  );

  const markTaskPending = useCallback((taskId: TaskId, txHash?: string) => {
    setTaskStates((prev) => ({
      ...prev,
      [taskId]: {
        state: "pending",
        txHash,
        startedAt: Date.now(),
      },
    }));
  }, []);

  const markTaskConfirmed = useCallback((taskId: TaskId) => {
    setTaskStates((prev) => ({
      ...prev,
      [taskId]: {
        state: "confirmed",
        txHash: prev[taskId].txHash,
        startedAt: prev[taskId].startedAt,
      },
    }));
  }, []);

  const markTaskFailed = useCallback((taskId: TaskId) => {
    setTaskStates((prev) => ({
      ...prev,
      [taskId]: {
        state: "failed",
        txHash: prev[taskId].txHash,
        startedAt: prev[taskId].startedAt,
      },
    }));
  }, []);

  const resetAll = useCallback(() => {
    setTaskStates({
      checkIn: { state: "idle", startedAt: 0 },
      gm: { state: "idle", startedAt: 0 },
      gn: { state: "idle", startedAt: 0 },
    });
  }, []);

  const optimisticActionCount = useCallback(
    (actualCount: number) => {
      return actualCount + pendingTasks.size;
    },
    [pendingTasks]
  );

  const isTaskPending = useCallback(
    (taskId: TaskId) => {
      return taskStates[taskId].state === "pending";
    },
    [taskStates]
  );

  const isTaskCompleted = useCallback(
    (taskId: TaskId, alreadyDoneOnChain: boolean) => {
      if (alreadyDoneOnChain) return true;
      return taskStates[taskId].state === "confirmed";
    },
    [taskStates]
  );

  const getOptimisticCompletedIds = useCallback(
    (onChainCompleted: Set<string>): Set<string> => {
      const result = new Set(onChainCompleted);
      for (const id of ALL_TASKS) {
        if (taskStates[id].state === "confirmed") {
          result.add(id);
        }
      }
      return result;
    },
    [taskStates]
  );

  return {
    pendingTasks,
    taskStates,
    optimisticActionCount,
    isTaskPending,
    isTaskCompleted,
    markTaskPending,
    markTaskConfirmed,
    markTaskFailed,
    resetAll,
    getOptimisticCompletedIds,
  };
}
