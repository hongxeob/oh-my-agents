import { Router, Request, Response } from 'express';
import { TaskStore } from './store';
import { TaskEvent } from './types';

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

  router.get('/api/tasks', (_req: Request, res: Response) => {
    res.json(store.getAll());
  });

  router.post('/api/tasks', (req: Request, res: Response) => {
    const body = normalizeBody(req);
    const taskId = body.taskId;
    const title = body.title;
    const assigneeAgent = body.assigneeAgent;

    if (!isNonEmptyString(taskId) || !isNonEmptyString(title) || !isNonEmptyString(assigneeAgent)) {
      return res.status(400).json({ error: 'taskId, title, assigneeAgent are required' });
    }

    try {
      const task = store.create(taskId, title, assigneeAgent);
      return res.status(201).json(task);
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        return res.status(409).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Failed to create task' });
    }
  });

  router.post('/api/events', (req: Request, res: Response) => {
    const body = normalizeBody(req);
    const event = body as TaskEvent;

    if (event.type !== 'task.started' && event.type !== 'task.completed' && event.type !== 'task.failed') {
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
