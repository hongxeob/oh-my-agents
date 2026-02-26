import { EventEmitter } from 'events';
import { Task, TaskEvent } from './types';

export class TaskStore extends EventEmitter {
  private tasks: Map<string, Task> = new Map();

  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  getById(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  create(taskId: string, title: string, assigneeAgent: string): Task {
    if (this.tasks.has(taskId)) {
      throw new Error(`Task ${taskId} already exists`);
    }

    const task: Task = {
      taskId,
      title,
      assigneeAgent,
      status: 'todo',
      updatedAt: new Date().toISOString(),
      recentLog: [],
      failed: false,
    };
    this.tasks.set(taskId, task);
    this.emit('task.updated', task);
    return task;
  }

  applyEvent(event: TaskEvent): Task {
    let task = this.tasks.get(event.taskId);

    if (event.type === 'task.started') {
      if (!task) {
        task = {
          taskId: event.taskId,
          title: event.title ?? '',
          assigneeAgent: event.assigneeAgent ?? '',
          status: 'doing',
          updatedAt: new Date().toISOString(),
          recentLog: [],
          failed: false,
        };
      } else {
        task = { ...task, status: 'doing' };
      }
    } else if (event.type === 'task.completed') {
      if (!task) throw new Error(`Task ${event.taskId} not found`);
      task = { ...task, status: 'done', failed: false, errorMessage: undefined };
    } else if (event.type === 'task.failed') {
      if (!task) throw new Error(`Task ${event.taskId} not found`);
      task = { ...task, status: 'done', failed: true, errorMessage: event.message };
    } else {
      throw new Error(`Unknown event type: ${(event as TaskEvent).type}`);
    }

    if (event.message) {
      const log = [...task.recentLog, event.message];
      task = { ...task, recentLog: log.slice(-3) };
    }

    task = { ...task, updatedAt: new Date().toISOString() };
    this.tasks.set(task.taskId, task);
    this.emit('task.updated', task);
    return task;
  }
}
