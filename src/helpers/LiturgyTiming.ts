export type StageTimer = {
  itemId: string | number;
  name: string;
  plannedSeconds: number;
  deadlineAt?: number | null;
  finishedAt?: number | null;
  elapsedMs: number;
  startedAt: number | null;
  status: "running" | "paused" | "finished";
};

export function durationSeconds(minutes: unknown): number {
  const value = Number(minutes);
  return Number.isFinite(value) && value > 0 ? Math.round(Math.min(value, 1440) * 60) : 0;
}

export function elapsedSeconds(timer: StageTimer, now: number): number {
  const running = timer.status === "running" && timer.startedAt !== null
    ? Math.max(0, now - timer.startedAt) : 0;
  return Math.floor((timer.elapsedMs + running) / 1000);
}

export function validEndTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function stageDuration(item: { timingMode?: string; plannedMinutes?: unknown }): number {
  return item.timingMode === "deadline" ? 0 : durationSeconds(item.plannedMinutes);
}

export function remainingStageSeconds(timer: StageTimer, now: number): number | null {
  if (timer.deadlineAt != null) {
    return Math.ceil((timer.deadlineAt - (timer.finishedAt ?? now)) / 1000);
  }
  return timer.plannedSeconds > 0 ? timer.plannedSeconds - elapsedSeconds(timer, now) : null;
}

export function startStage(item: { id: string | number; name: string; plannedMinutes?: unknown; timingMode?: string; endTime?: string }, now: number): StageTimer {
  let deadlineAt: number | null = null;
  if (item.timingMode === "deadline" && validEndTime(item.endTime)) {
    const deadline = new Date(now);
    const [hours, minutes] = item.endTime.split(":").map(Number);
    deadline.setHours(hours, minutes, 0, 0);
    deadlineAt = deadline.getTime();
  }
  return { itemId: item.id, name: item.name, plannedSeconds: stageDuration(item), deadlineAt, finishedAt: null, elapsedMs: 0, startedAt: now, status: "running" };
}

export function changeStageStatus(timer: StageTimer, status: StageTimer["status"], now: number): StageTimer {
  const elapsedMs = timer.elapsedMs + (timer.status === "running" && timer.startedAt !== null ? Math.max(0, now - timer.startedAt) : 0);
  return { ...timer, elapsedMs, finishedAt: status === "finished" ? now : null, startedAt: status === "running" ? now : null, status };
}

export function formatStageTime(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor(value / 60) % 60;
  const tail = `${String(minutes).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  return hours ? `${hours}:${tail}` : tail;
}
