import { EventEmitter } from 'events';
import { Task, TaskEvent, TaskPatch, LogEntry } from './types';

function now(): string {
  return new Date().toISOString();
}

function deriveRecentLog(activityLog: LogEntry[]): string[] {
  const result: string[] = [];
  for (let i = activityLog.length - 1; i >= 0 && result.length < 3; i--) {
    const e = activityLog[i];
    if (e.type === 'progress' || e.type === 'error') result.push(e.message);
  }
  return result.reverse();
}

export class TaskStore extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private projectIds: Set<string> = new Set();

  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  getById(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getByProject(projectId: string): Task[] {
    const result: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.projectId === projectId) result.push(task);
    }
    return result;
  }

  getProjects(): string[] {
    return Array.from(this.projectIds).sort();
  }

  create(taskId: string, title: string, assigneeAgent: string, projectId = 'default'): Task {
    if (this.tasks.has(taskId)) {
      throw new Error(`Task ${taskId} already exists`);
    }

    const entry: LogEntry = {
      timestamp: now(),
      message: 'Task created',
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
    this.projectIds.add(projectId);
    this.tasks.set(taskId, task);
    this.emit('task.updated', task);
    return task;
  }

  applyEvent(event: TaskEvent): Task {
    let task = this.tasks.get(event.taskId);
    const timestamp = now();
    const newEntries: LogEntry[] = [];

    if (event.type === 'task.started') {
      newEntries.push({ timestamp, message: 'Task started', type: 'status_change' });
      if (!task) {
        const projectId = event.projectId ?? 'default';
        this.projectIds.add(projectId);
        task = {
          taskId: event.taskId,
          projectId,
          title: event.title ?? '',
          assigneeAgent: event.assigneeAgent ?? '',
          status: 'doing',
          updatedAt: timestamp,
          activityLog: [],
          recentLog: [],
          failed: false,
          notes: '',
          subTasks: [],
        };
      } else {
        task = { ...task, status: 'doing' };
      }
    } else if (event.type === 'task.completed') {
      if (!task) throw new Error(`Task ${event.taskId} not found`);
      newEntries.push({ timestamp, message: 'Task completed', type: 'status_change' });
      task = { ...task, status: 'done', failed: false, errorMessage: undefined };
    } else if (event.type === 'task.failed') {
      if (!task) throw new Error(`Task ${event.taskId} not found`);
      newEntries.push({
        timestamp,
        message: `Task failed${event.message ? `: ${event.message}` : ''}`,
        type: 'error',
      });
      task = { ...task, status: 'done', failed: true, errorMessage: event.message };
    } else {
      throw new Error(`Unknown event type: ${(event as TaskEvent).type}`);
    }

    if (event.message && event.type !== 'task.failed') {
      newEntries.push({ timestamp, message: event.message, type: 'progress' });
    }

    const activityLog = [...task.activityLog, ...newEntries];
    task = {
      ...task,
      activityLog,
      recentLog: deriveRecentLog(activityLog),
      updatedAt: timestamp,
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
