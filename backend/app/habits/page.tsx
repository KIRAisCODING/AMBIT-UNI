"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button, Card, Empty, Input, Pill } from "@/components/ui";

type Habit = {
  id: string;
  name: string;
  frequency: "daily" | "weekly";
  streak: number;
  longestStreak?: number;
  completedDays: string[];
  createdAt: string;
  project?: string;
  area?: string;
  subProject?: string;
  notes?: string;
};

type AreaOption = { id: string; name: string; projects?: Array<{ id: string; name: string; subProjects?: Array<{ id: string; name: string }> }> };

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [project, setProject] = useState("");
  const [area, setArea] = useState("");

  const loadHabits = async () => {
    const res = await fetch("/api/habits");
    const data = await res.json();
    setHabits(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    void (async () => {
      await loadHabits();
      const res = await fetch("/api/areas");
      const data = await res.json();
      setAreas(Array.isArray(data) ? data : []);
    })();
  }, []);

  const createHabit = async () => {
    if (!name.trim()) return;

    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), frequency, project, area }),
    });

    setName("");
    setProject("");
    setArea("");
    await loadHabits();
  };

  const toggleDay = async (habitId: string) => {
    await fetch(`/api/habits/${habitId}/toggle`, { method: "PATCH" });
    await loadHabits();
  };

  return (
    <AppLayout>
      <div className="flex h-full flex-col gap-6 rounded-[32px] border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.05)] sm:p-8">
        <header className="flex flex-col gap-4 border-b border-[color:var(--border)]/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">Practice</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--text)] sm:text-4xl">Habits</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">Track routines and keep your streaks visible in the same workspace.</p>
          </div>
          <Pill>{habits.length} habit{habits.length === 1 ? "" : "s"}</Pill>
        </header>

        <Card as="section" title="Add a habit" description="Create a new routine and connect it to your current workspace structure." className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]">
          <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_1fr_auto]">
            <Input label="Habit" value={name} onChange={(e) => setName(e.target.value)} placeholder="Meditate for 10 minutes" />
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">Frequency</span>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")} className="h-12 w-full rounded-[999px] border border-[color:var(--border)]/70 bg-[var(--surface-container)] px-5 text-sm text-[var(--text)] outline-none">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">Area</span>
              <select value={area} onChange={(e) => { setArea(e.target.value); setProject(""); }} className="h-12 w-full rounded-[999px] border border-[color:var(--border)]/70 bg-[var(--surface-container)] px-5 text-sm text-[var(--text)] outline-none">
                <option value="">Any area</option>
                {areas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <Button onClick={createHabit}>Create</Button>
          </div>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {habits.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <Empty title="No habits yet" description="Add routines here and they will stay in sync with the backend." />
            </div>
          ) : (
            habits.map((habit) => (
              <Card key={habit.id} as="article" interactive className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">{habit.frequency}</p>
                    <h2 className="mt-2 text-lg font-semibold text-[var(--text)]">{habit.name}</h2>
                  </div>
                  <Pill>{habit.streak} day{habit.streak === 1 ? "" : "s"}</Pill>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-[20px] border border-[color:var(--border)]/70 bg-[var(--surface-low)] p-3 text-sm text-[var(--text-muted)]">
                  <span>Today</span>
                  <Button size="sm" variant={habit.completedDays.includes(new Date().toISOString().slice(0, 10)) ? "secondary" : "primary"} onClick={() => toggleDay(habit.id)}>
                    {habit.completedDays.includes(new Date().toISOString().slice(0, 10)) ? "Completed" : "Mark done"}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </section>
      </div>
    </AppLayout>
  );
}
