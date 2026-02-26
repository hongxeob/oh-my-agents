export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  taskId: string;
  title: string;
  assigneeAgent: string;
  status: TaskStatus;
  updatedAt: string;
  recentLog: string[];
  failed: boolean;
  errorMessage?: string;
}
