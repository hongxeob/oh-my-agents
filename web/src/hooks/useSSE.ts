import { useState, useEffect, useMemo } from 'react';
import { Task, TaskStatus } from '../types';

type TaskRecord = Record<string, Task>;

export interface GroupedTasks {
  todo: Task[];
  doing: Task[];
  done: Task[];
}

export interface SSEResult {
  grouped: GroupedTasks;
  projects: string[];
  allTasks: Task[];
  tasksById: TaskRecord;
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false;
  const task = value as Partial<Task>;
  return (
    typeof task.taskId === 'string' &&
    typeof task.title === 'string' &&
    typeof task.assigneeAgent === 'string' &&
    (task.status === 'todo' || task.status === 'doing' || task.status === 'done') &&
    typeof task.updatedAt === 'string' &&
    Array.isArray(task.recentLog) &&
    typeof task.failed === 'boolean'
  );
}

function parseTaskList(raw: string): Task[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTask);
  } catch {
    return [];
  }
}

function parseTask(raw: string): Task | null {
  try {
    const parsed = JSON.parse(raw);
    return isTask(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function groupAndSort(tasks: Task[]): GroupedTasks {
  const grouped: GroupedTasks = { todo: [], doing: [], done: [] };
  for (const task of tasks) {
    const bucket = task.status as TaskStatus;
    if (bucket in grouped) grouped[bucket].push(task);
  }
  for (const key of Object.keys(grouped) as TaskStatus[]) {
    grouped[key].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  return grouped;
}

export function useSSE(projectId?: string): SSEResult {
  const [tasksById, setTasksById] = useState<TaskRecord>({});

  useEffect(() => {
    const es = new EventSource('/api/sse');

    es.addEventListener('init', (e: MessageEvent) => {
      const taskArray = parseTaskList(e.data);
      const record: TaskRecord = {};
      for (const task of taskArray) record[task.taskId] = task;
      setTasksById(record);
    });

    es.addEventListener('task.updated', (e: MessageEvent) => {
      const task = parseTask(e.data);
      if (!task) return;
      setTasksById((prev) => ({ ...prev, [task.taskId]: task }));
    });

    return () => es.close();
  }, []);

  const allTasks = useMemo(() => Object.values(tasksById), [tasksById]);

  const projects = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTasks) if (t.projectId) set.add(t.projectId);
    return Array.from(set).sort();
  }, [allTasks]);

  const filtered = useMemo(
    () => (projectId ? allTasks.filter((t) => t.projectId === projectId) : allTasks),
    [allTasks, projectId]
  );

  const grouped = useMemo(() => groupAndSort(filtered), [filtered]);

  return { grouped, projects, allTasks, tasksById };
}
