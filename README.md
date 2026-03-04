# Agent Team Kanban Dashboard

에이전트 팀의 작업 상태를 실시간 칸반 보드로 시각화하는 대시보드.
REST API + SSE로 실시간 업데이트, MCP 서버로 Claude Code에서 직접 태스크를 관리할 수 있다.

## Quick Start

```bash
bun install
bun run dev
```

- **Dashboard**: http://localhost:5173
- **API Server**: http://localhost:3001

## Features

- **프로젝트 탭** — 상단 탭으로 프로젝트별 칸반 보드 필터링
- **실시간 업데이트** — SSE로 에이전트 작업 현황을 즉시 반영
- **태스크 상세 패널** — 카드 클릭 시 우측 슬라이드 패널에서 상세 내역 확인
  - Activity Log: 타임스탬프가 있는 전체 작업 이력
  - Notes: 자유 텍스트 메모 (자동 저장)
  - Sub Tasks: 서브 할일 추가/체크/삭제

## Project Structure

```
oh-my-agents/
├── server/           # Express + SSE + in-memory store (port 3001)
│   └── src/
│       ├── index.ts      # 서버 엔트리
│       ├── store.ts      # TaskStore (EventEmitter 기반)
│       ├── routes.ts     # REST API 라우트
│       ├── sse.ts        # SSE 엔드포인트
│       ├── types.ts      # 공유 타입
│       └── seed.ts       # 샘플 데이터 (alpha-project, beta-project)
├── web/              # React + Vite + Tailwind (port 5173)
│   └── src/
│       ├── components/
│       │   ├── KanbanBoard.tsx      # 보드 루트 (프로젝트 탭 포함)
│       │   ├── KanbanColumn.tsx     # 컬럼 (Todo / Doing / Done)
│       │   ├── TaskCard.tsx         # 카드 (클릭 시 상세 패널 오픈)
│       │   ├── ProjectTabs.tsx      # 프로젝트 필터 탭
│       │   └── TaskDetailPanel.tsx  # 슬라이드 상세 패널
│       └── hooks/
│           └── useSSE.ts            # 실시간 데이터 수신 + 프로젝트 목록
├── mcp/              # MCP 서버 (stdio, Express에 HTTP 프록시)
│   └── src/
│       └── index.ts      # 4개 tool 정의
└── package.json      # bun workspace root
```

## Data Storage

> **주의: 모든 데이터는 메모리에만 저장됩니다.**

서버를 재시작하면 생성한 태스크, 메모, 서브 태스크, 활동 로그가 모두 초기화되고
`seed.ts`의 샘플 데이터로 돌아갑니다.

### 프로젝트는 어떻게 저장되나?

별도 프로젝트 테이블이 없습니다. **태스크에 `projectId` 필드가 있고**, 서버는 존재하는
태스크들의 `projectId`를 집계해 프로젝트 목록을 동적으로 반환합니다.

```
태스크 생성 시 projectId 지정  →  TaskStore 내부 Set에 추가
GET /api/projects              →  Set을 정렬해 반환
```

즉, 태스크가 하나도 없는 프로젝트는 존재하지 않습니다. 새 프로젝트를 만들려면
해당 `projectId`로 태스크를 하나 생성하면 됩니다.

### 데이터 영속화가 필요하다면?

현재 `TaskStore`는 순수 인메모리(`Map<string, Task>`)입니다. 영속화가 필요한 경우:

- **간단한 방법**: `store.ts`에서 `Map` 대신 JSON 파일 읽기/쓰기 추가
- **본격적인 방법**: SQLite(Bun 내장) 또는 Redis 어댑터로 교체

`TaskStore`의 `create`, `applyEvent`, `patch` 메서드만 수정하면 됩니다.

## Data Model

### Task

| 필드 | 타입 | 설명 |
|------|------|------|
| `taskId` | `string` | 고유 ID |
| `projectId` | `string` | 소속 프로젝트 (기본값: `"default"`) |
| `title` | `string` | 태스크 제목 |
| `assigneeAgent` | `string` | 담당 에이전트 이름 |
| `status` | `"todo" \| "doing" \| "done"` | 현재 상태 |
| `activityLog` | `LogEntry[]` | 전체 활동 이력 (타임스탬프 포함) |
| `recentLog` | `string[]` | 최근 3개 메시지 (카드 표시용) |
| `notes` | `string` | 자유 메모 |
| `subTasks` | `SubTask[]` | 서브 할일 목록 |
| `failed` | `boolean` | 실패 여부 |
| `errorMessage` | `string?` | 실패 시 에러 내용 |
| `updatedAt` | `string` | 마지막 업데이트 시각 (ISO 8601) |

### LogEntry

| 필드 | 타입 | 설명 |
|------|------|------|
| `timestamp` | `string` | ISO 8601 |
| `message` | `string` | 로그 메시지 |
| `type` | `"status_change" \| "progress" \| "error" \| "note"` | 로그 종류 |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tasks` | 태스크 목록 (`?projectId=`, `?status=` 필터 지원) |
| `GET` | `/api/tasks/:taskId` | 단일 태스크 조회 |
| `PATCH` | `/api/tasks/:taskId` | 태스크 수정 (`notes`, `subTasks`) |
| `POST` | `/api/tasks` | 새 태스크 생성 (todo) |
| `POST` | `/api/events` | 이벤트 수신 (상태 전이) |
| `GET` | `/api/projects` | 프로젝트 목록 |
| `GET` | `/api/sse` | SSE 스트림 (실시간 업데이트) |

## curl Examples

### 새 프로젝트에 태스크 생성

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"taskId":"task-010","title":"API 설계","assigneeAgent":"agent-alpha","projectId":"my-project"}'
```

### 작업 시작 (task.started)

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"task.started","taskId":"task-010","title":"API 설계","assigneeAgent":"agent-alpha","projectId":"my-project","message":"작업을 시작합니다"}'
```

> `task.started` 이벤트는 태스크가 없으면 자동 생성합니다.
> 이 경우 `title`, `assigneeAgent`가 필수입니다.

### 진행 메시지 전송

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"task.started","taskId":"task-010","message":"엔드포인트 초안 완료"}'
```

### 작업 완료 (task.completed)

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"task.completed","taskId":"task-010","message":"API 설계 완료"}'
```

### 작업 실패 (task.failed)

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"task.failed","taskId":"task-010","message":"Connection refused: DB host unreachable"}'
```

### 프로젝트별 태스크 조회

```bash
# 특정 프로젝트만
curl "http://localhost:3001/api/tasks?projectId=my-project"

# 상태 + 프로젝트 복합 필터
curl "http://localhost:3001/api/tasks?projectId=my-project&status=doing"

# 프로젝트 목록
curl http://localhost:3001/api/projects
```

## State Transitions

```
[없음] ──task.started──▶ doing
[todo] ──task.started──▶ doing
doing  ──task.completed─▶ done  (failed=false)
doing  ──task.failed────▶ done  (failed=true)
```

## MCP Server

### MCP Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| `kanban_create_task` | `taskId`, `title`, `assigneeAgent`, `projectId?` | todo에 태스크 생성 |
| `kanban_send_event` | `type`, `taskId`, `title?`, `assigneeAgent?`, `message?` | 이벤트 전송 (상태 변경) |
| `kanban_list_tasks` | `status?`, `projectId?` | 태스크 목록 조회 |
| `kanban_get_task` | `taskId` | 단일 태스크 조회 |

### 다른 프로젝트에서 사용하기

#### 1. 서버 실행

```bash
cd /path/to/oh-my-agents
bun install
bun run dev        # 서버(3001) + 웹(5173) 동시 실행
```

#### 2. 프로젝트에 MCP 설정 추가

사용할 프로젝트 루트에 `.mcp.json` 파일을 생성:

```json
{
  "mcpServers": {
    "kanban": {
      "command": "bun",
      "args": ["mcp/src/index.ts"],
      "cwd": "/path/to/oh-my-agents"
    }
  }
}
```

> `cwd`를 oh-my-agents의 **절대 경로**로 변경할 것.

또는 `claude mcp add` 명령어로 추가:

```bash
claude mcp add kanban -- bun /path/to/oh-my-agents/mcp/src/index.ts
```

#### 3. Claude Code에서 사용

```
"my-project 프로젝트로 API 설계 태스크 만들어줘"
→ kanban_create_task(taskId: "task-001", title: "API 설계", assigneeAgent: "agent-alpha", projectId: "my-project")

"task-001 시작해"
→ kanban_send_event(type: "task.started", taskId: "task-001", title: "API 설계", assigneeAgent: "agent-alpha")

"my-project 진행 중인 작업 보여줘"
→ kanban_list_tasks(status: "doing", projectId: "my-project")

"task-001 완료 처리해"
→ kanban_send_event(type: "task.completed", taskId: "task-001")
```

#### 4. 팀 에이전트와 함께 사용하기

CLAUDE.md 또는 프롬프트에 추가:

```markdown
## 작업 추적 규칙

모든 작업은 projectId: "my-project"로 칸반 보드에 기록한다.

- 작업 시작 시 kanban_send_event(type: "task.started", projectId: "my-project") 호출
- 진행 상황은 kanban_send_event(message: "...")로 수시로 업데이트
- 완료 시 kanban_send_event(type: "task.completed") 호출
- 실패 시 kanban_send_event(type: "task.failed", message: "에러 내용") 호출

브라우저에서 http://localhost:5173 으로 실시간 진행 상황 확인 가능.
```
