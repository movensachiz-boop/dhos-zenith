import { useEffect, useState } from 'react';

export type Countdown = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  overdue: boolean;
  label: string;
};

export function countdownTo(target: Date | string | null | undefined, now = Date.now()): Countdown | null {
  if (!target) return null;
  const t = typeof target === 'string' ? new Date(target) : target;
  if (Number.isNaN(t.getTime())) return null;
  const diff = t.getTime() - now;
  const overdue = diff < 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const parts = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return {
    totalMs: diff,
    days,
    hours,
    minutes,
    overdue,
    label: overdue ? `${parts} overdue` : `${parts} left`,
  };
}

/** Ticks every minute so countdowns stay live. */
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Next occurrence of a repeating cycle that started at `start` and repeats every `cycleDays`. */
export function nextCycleDate(start: Date | string, cycleDays: number, now = Date.now()) {
  const s = typeof start === 'string' ? new Date(start) : start;
  const days = Math.max(1, Number(cycleDays) || 1);
  const period = days * 86400000;
  const elapsed = now - s.getTime();
  const index = elapsed <= 0 ? 0 : Math.floor(elapsed / period) + 1;
  return { date: new Date(s.getTime() + index * period), cycleIndex: index + 1 };
}

export function cycleDate(start: Date | string, cycleDays: number, index: number) {
  const s = typeof start === 'string' ? new Date(start) : start;
  return new Date(s.getTime() + (index - 1) * Math.max(1, Number(cycleDays) || 1) * 86400000);
}
