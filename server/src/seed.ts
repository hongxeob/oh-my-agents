import { TaskStore } from './store';

export function seedTasks(store: TaskStore): void {
  // Project: alpha-project
  store.create('task-001', 'API 엔드포인트 설계', 'agent-alpha', 'alpha-project');

  store.applyEvent({
    type: 'task.started',
    taskId: 'task-002',
    title: '데이터베이스 스키마 작성',
    assigneeAgent: 'agent-beta',
    projectId: 'alpha-project',
    message: 'ERD 초안 작성 시작',
  });

  store.applyEvent({
    type: 'task.started',
    taskId: 'task-003',
    title: '인증 모듈 구현',
    assigneeAgent: 'agent-gamma',
    projectId: 'alpha-project',
    message: 'JWT 토큰 구조 설계 완료',
  });

  store.applyEvent({
    type: 'task.started',
    taskId: 'task-004',
    title: '단위 테스트 작성',
    assigneeAgent: 'agent-alpha',
    projectId: 'alpha-project',
    message: '테스트 케이스 목록 정리',
  });
  store.applyEvent({ type: 'task.completed', taskId: 'task-004', message: '전체 커버리지 87% 달성' });

  store.applyEvent({
    type: 'task.started',
    taskId: 'task-005',
    title: 'CI/CD 파이프라인 설정',
    assigneeAgent: 'agent-delta',
    projectId: 'alpha-project',
  });
  store.applyEvent({
    type: 'task.failed',
    taskId: 'task-005',
    message: 'Pipeline timeout after 300s',
  });

  // Project: beta-project
  store.create('task-006', '랜딩 페이지 디자인', 'agent-ui', 'beta-project');

  store.applyEvent({
    type: 'task.started',
    taskId: 'task-007',
    title: '결제 API 연동',
    assigneeAgent: 'agent-beta',
    projectId: 'beta-project',
    message: 'Stripe SDK 초기화 완료',
  });
}
