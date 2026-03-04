export type TaskStatus = 'todo' | 'doing' | 'done';

export type LogEntryType = 'status_change' | 'progress' | 'error' | 'note';

export interface LogEntry {
  timestamp: string;   // ISO 8601
  message: string;
  type: LogEntryType;
}

export interface SubTask {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;   // ISO 8601
}

export interface Task {
  taskId: string;
  projectId: string;
  title: string;
  assigneeAgent: string;
  status: TaskStatus;
  updatedAt: string;       // ISO 8601
  activityLog: LogEntry[]; // full history
  recentLog: string[];     // last 3 messages (derived, for card display)
  failed: boolean;
  errorMessage?: string;
  notes: string;
  subTasks: SubTask[];
}

export type EventType = 'task.started' | 'task.completed' | 'task.failed';

export interface TaskEvent {
  type: EventType;
  taskId: string;
  projectId?: string;
  title?: string;          // required on task.started for new tasks
  assigneeAgent?: string;  // required on task.started for new tasks
  message?: string;        // log or error message
}

export interface TaskPatch {
  notes?: string;
  subTasks?: SubTask[];
}
