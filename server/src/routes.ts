import { Router, Request, Response } from 'express';
import { TaskStore } from './store';
import { EventType, TaskEvent, TaskPatch, SubTask } from './types';

const EVENT_TYPES: readonly EventType[] = ['task.started', 'task.completed', 'task.failed'];
const TASK_STATUSES = ['todo', 'doing', 'done'] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeBody(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return {};
  }
  return req.body as Record<string, unknown>;
}

export function createRouter(store: TaskStore): Router {
  const router = Router();

  // List all tasks (optionally filtered by projectId and/or status)
  router.get('/api/tasks', (req: Request, res: Response) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    const status = typeof req.query.status === 'string' && TASK_STATUSES.includes(req.query.status as typeof TASK_STATUSES[number])
      ? req.query.status as typeof TASK_STATUSES[number]
      : undefined;

    let tasks = projectId ? store.getByProject(projectId) : store.getAll();
    if (status) tasks = tasks.filter((t) => t.status === status);
    res.json(tasks);
  });

  // Get single task by ID
  router.get('/api/tasks/:taskId', (req: Request, res: Response) => {
    const task = store.getById(String(req.params.taskId));
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.json(task);
  });

  // List all projects
  router.get('/api/projects', (_req: Request, res: Response) => {
    res.json(store.getProjects());
  });

  // Create task
  router.post('/api/tasks', (req: Request, res: Response) => {
    const body = normalizeBody(req);
    const taskId = body.taskId;
    const title = body.title;
    const assigneeAgent = body.assigneeAgent;

    if (!isNonEmptyString(taskId) || !isNonEmptyString(title) || !isNonEmptyString(assigneeAgent)) {
      return res.status(400).json({ error: 'taskId, title, assigneeAgent are required' });
    }

    const projectId = isNonEmptyString(body.projectId) ? body.projectId : undefined;

    try {
      const task = store.create(taskId, title, assigneeAgent, projectId);
      return res.status(201).json(task);
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        return res.status(409).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Patch task (notes, subTasks)
  router.patch('/api/tasks/:taskId', (req: Request, res: Response) => {
    const taskId = String(req.params.taskId);
    const body = normalizeBody(req);

    const patch: TaskPatch = {};
    if (typeof body.notes === 'string') {
      patch.notes = body.notes;
    }
    if (Array.isArray(body.subTasks)) {
      patch.subTasks = (body.subTasks as unknown[]).filter((s): s is SubTask => {
        if (!s || typeof s !== 'object') return false;
        const sub = s as Partial<SubTask>;
        return (
          typeof sub.id === 'string' &&
          typeof sub.text === 'string' &&
          typeof sub.done === 'boolean' &&
          typeof sub.createdAt === 'string'
        );
      });
    }

    try {
      const task = store.patch(taskId, patch);
      return res.json(task);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Failed to patch task' });
    }
  });

  // Send event
  router.post('/api/events', (req: Request, res: Response) => {
    const body = normalizeBody(req);
    const event = body as unknown as TaskEvent;

    if (!EVENT_TYPES.includes(event.type)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }
    if (!isNonEmptyString(event.taskId)) {
      return res.status(400).json({ error: 'taskId is required' });
    }
    if (event.type === 'task.started' && (!isNonEmptyString(event.title) || !isNonEmptyString(event.assigneeAgent))) {
      return res.status(400).json({ error: 'title, assigneeAgent are required for task.started' });
    }
    if (event.message !== undefined && typeof event.message !== 'string') {
      return res.status(400).json({ error: 'message must be a string' });
    }
    try {
      const task = store.applyEvent(event);
      return res.json(task);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Failed to apply event' });
    }
  });

  return router;
}
