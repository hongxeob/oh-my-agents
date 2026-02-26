import { Router, Request, Response } from 'express';
import { TaskStore } from './store';
import { Task } from './types';

export function createSseRouter(store: TaskStore): Router {
  const router = Router();

  router.get('/api/sse', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial state
    res.write(`event: init\ndata: ${JSON.stringify(store.getAll())}\n\n`);

    const onTaskUpdated = (task: Task) => {
      res.write(`event: task.updated\ndata: ${JSON.stringify(task)}\n\n`);
    };

    store.on('task.updated', onTaskUpdated);

    req.on('close', () => {
      store.removeListener('task.updated', onTaskUpdated);
    });
  });

  return router;
}
