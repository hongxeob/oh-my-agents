import { EventEmitter } from 'events';
import { Task, TaskEvent, TaskPatch, LogEntry } from './types';

function now(): string {
  return new Date().toISOString();
}

function deriveRecentLog(activityLog: LogEntry[]): string[] {
  return activityLog
    .filter((e) => e.type === 'progress' || e.type === 'error')
    .slice(-3)
    .map((e) => e.message);
}

export class TaskStore extends EventEmitter {
  private tasks: Map<string, Task> = new Map();

  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  getById(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getProjects(): string[] {
    const projects = new Set<string>();
    for (const task of this.tasks.values()) {
      projects.add(task.projectId);
    }
    return Array.from(projects).sort();
  }

  create(taskId: string, title: string, assigneeAgent: string, projectId = 'default'): Task {
    if (this.tasks.has(taskId)) {
      throw new Error(`Task ${taskId} already exists`);
    }

    const entry: LogEntry = {
      timestamp: now(),
      message: `Task created`,
      type: 'status_change',
    };

    const task: Task = {
      taskId,
      projectId,
      title,
      assigneeAgent,
      status: 'todo',
      updatedAt: now(),
      activityLog: [entry],
      recentLog: [],
      failed: false,
      notes: '',
      subTasks: [],
    };
    this.tasks.set(taskId, task);
    this.emit('task.updated', task);
    return task;
  }

  applyEvent(event: TaskEvent): Task {
    let task = this.tasks.get(event.taskId);
    const timestamp = now();

    if (event.type === 'task.started') {
      const statusEntry: LogEntry = { timestamp, message: 'Task started', type: 'status_change' };
      if (!task) {
        task = {
          taskId: event.taskId,
          projectId: event.projectId ?? 'default',
          title: event.title ?? '',
          assigneeAgent: event.assigneeAgent ?? '',
          status: 'doing',
          updatedAt: timestamp,
          activityLog: [statusEntry],
          recentLog: [],
          failed: false,
          notes: '',
          subTasks: [],
        };
      } else {
        task = {
          ...task,
          status: 'doing',
          activityLog: [...task.activityLog, statusEntry],
        };
      }
    } else if (event.type === 'task.completed') {
      if (!task) throw new Error(`Task ${event.taskId} not found`);
      const statusEntry: LogEntry = { timestamp, message: 'Task completed', type: 'status_change' };
      task = {
        ...task,
        status: 'done',
        failed: false,
        errorMessage: undefined,
        activityLog: [...task.activityLog, statusEntry],
      };
    } else if (event.type === 'task.failed') {
      if (!task) throw new Error(`Task ${event.taskId} not found`);
      const statusEntry: LogEntry = {
        timestamp,
        message: `Task failed${event.message ? `: ${event.message}` : ''}`,
        type: 'error',
      };
      task = {
        ...task,
        status: 'done',
        failed: true,
        errorMessage: event.message,
        activityLog: [...task.activityLog, statusEntry],
      };
    } else {
      throw new Error(`Unknown event type: ${(event as TaskEvent).type}`);
    }

    if (event.message && event.type !== 'task.failed') {
      const progressEntry: LogEntry = { timestamp, message: event.message, type: 'progress' };
      task = { ...task, activityLog: [...task.activityLog, progressEntry] };
    }

    task = {
      ...task,
      updatedAt: timestamp,
      recentLog: deriveRecentLog(task.activityLog),
    };

    this.tasks.set(task.taskId, task);
    this.emit('task.updated', task);
    return task;
  }

  patch(taskId: string, patch: TaskPatch): Task {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const updated: Task = {
      ...task,
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.subTasks !== undefined ? { subTasks: patch.subTasks } : {}),
      updatedAt: now(),
    };

    this.tasks.set(taskId, updated);
    this.emit('task.updated', updated);
    return updated;
  }
}
