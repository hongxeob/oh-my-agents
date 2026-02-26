import { TaskStore } from './store';

export function seedTasks(store: TaskStore): void {
  // 1. todo
  store.create('task-001', 'API 엔드포인트 설계', 'agent-alpha');

  // 2. doing
  store.applyEvent({
    type: 'task.started',
    taskId: 'task-002',
    title: '데이터베이스 스키마 작성',
    assigneeAgent: 'agent-beta',
  });

  // 3. doing
  store.applyEvent({
    type: 'task.started',
    taskId: 'task-003',
    title: '인증 모듈 구현',
    assigneeAgent: 'agent-gamma',
  });

  // 4. done
  store.applyEvent({
    type: 'task.started',
    taskId: 'task-004',
    title: '단위 테스트 작성',
    assigneeAgent: 'agent-alpha',
  });
  store.applyEvent({ type: 'task.completed', taskId: 'task-004' });

  // 5. done + failed
  store.applyEvent({
    type: 'task.started',
    taskId: 'task-005',
    title: 'CI/CD 파이프라인 설정',
    assigneeAgent: 'agent-delta',
  });
  store.applyEvent({
    type: 'task.failed',
    taskId: 'task-005',
    message: 'Pipeline timeout after 300s',
  });
}
