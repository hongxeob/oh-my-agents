import { useState, useEffect } from 'react';
import { Task, TaskStatus } from '../types';

type TaskRecord = Record<string, Task>;

interface GroupedTasks {
  todo: Task[];
  doing: Task[];
  done: Task[];
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

export function useSSE(): GroupedTasks {
  const [tasks, setTasks] = useState<TaskRecord>({});

  useEffect(() => {
    const es = new EventSource('/api/sse');

    es.addEventListener('init', (e: MessageEvent) => {
      const taskArray: Task[] = parseTaskList(e.data);
      const record: TaskRecord = {};
      for (const task of taskArray) {
        record[task.taskId] = task;
      }
      setTasks(record);
    });

    es.addEventListener('task.updated', (e: MessageEvent) => {
      const task = parseTask(e.data);
      if (!task) return;
      setTasks((prev) => ({ ...prev, [task.taskId]: task }));
    });

    return () => {
      es.close();
    };
  }, []);

  const grouped: GroupedTasks = { todo: [], doing: [], done: [] };
  for (const task of Object.values(tasks)) {
    const bucket = task.status as TaskStatus;
    if (bucket in grouped) {
      grouped[bucket].push(task);
    }
  }

  for (const key of Object.keys(grouped) as TaskStatus[]) {
    grouped[key].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  return grouped;
}
