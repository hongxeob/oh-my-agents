export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  taskId: string;
  title: string;
  assigneeAgent: string;
  status: TaskStatus;
  updatedAt: string;       // ISO 8601
  recentLog: string[];     // max 3 lines
  failed: boolean;
  errorMessage?: string;   // only when failed
}

export type EventType = 'task.started' | 'task.completed' | 'task.failed';

export interface TaskEvent {
  type: EventType;
  taskId: string;
  title?: string;          // required on task.started for new tasks
  assigneeAgent?: string;  // required on task.started for new tasks
  message?: string;        // log or error message
}
