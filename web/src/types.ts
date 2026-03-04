export type TaskStatus = 'todo' | 'doing' | 'done';

export type LogEntryType = 'status_change' | 'progress' | 'error' | 'note';

export interface LogEntry {
  timestamp: string;
  message: string;
  type: LogEntryType;
}

export interface SubTask {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface Task {
  taskId: string;
  projectId: string;
  title: string;
  assigneeAgent: string;
  status: TaskStatus;
  updatedAt: string;
  activityLog: LogEntry[];
  recentLog: string[];
  failed: boolean;
  errorMessage?: string;
  notes: string;
  subTasks: SubTask[];
}
