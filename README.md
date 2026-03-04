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
│       └── seed.ts       # 샘플 데이터 5개
├── web/              # React + Vite + Tailwind (port 5173)
│   └── src/
│       ├── components/   # KanbanBoard, KanbanColumn, TaskCard
│       └── hooks/        # useSSE (실시간 데이터 수신)
├── mcp/              # MCP 서버 (stdio, Express에 HTTP 프록시)
│   └── src/
│       └── index.ts      # 4개 tool 정의
└── package.json      # bun workspace root
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tasks` | 전체 태스크 목록 |
| `POST` | `/api/tasks` | 새 태스크 생성 (todo) |
| `POST` | `/api/events` | 이벤트 수신 (상태 전이) |
| `GET` | `/api/sse` | SSE 스트림 (실시간 업데이트) |

## curl Examples

### 1. 새 작업 시작 (task.started)

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"task.started","taskId":"task-006","title":"로깅 시스템 구축","assigneeAgent":"agent-epsilon","message":"작업을 시작합니다"}'
```

### 2. 작업 완료 (task.completed)

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"task.completed","taskId":"task-006","message":"로깅 시스템 구축 완료"}'
```

### 3. 작업 실패 (task.failed)

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"task.failed","taskId":"task-002","message":"Connection refused: DB host unreachable"}'
```

## MCP Server

### MCP Tools

| Tool | Description | Parameters |
|------|-------------|-----------|
| `kanban_create_task` | todo에 태스크 생성 | taskId, title, assigneeAgent |
| `kanban_send_event` | 이벤트 전송 (상태 변경) | type, taskId, message? |
| `kanban_list_tasks` | 전체 태스크 조회 | status? (필터) |
| `kanban_get_task` | 단일 태스크 조회 | taskId |

### 다른 프로젝트에서 사용하기

다른 프로젝트에서 Claude Code 팀 에이전트가 칸반 대시보드를 사용하도록 설정하는 방법:

#### 1. 서버 실행

먼저 oh-my-agents 서버를 띄워둔다:

```bash
cd /path/to/oh-my-agents
bun install
bun run dev        # 서버(3001) + 웹(5173) 동시 실행
# 또는 서버만: bun run dev:server
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

또는 `claude mcp add` 명령어로 추가할 수도 있다:

```bash
claude mcp add kanban -- bun /path/to/oh-my-agents/mcp/src/index.ts
```

#### 3. Claude Code에서 사용

해당 프로젝트 디렉토리에서 Claude Code를 실행하면 MCP 도구가 자동 로드된다:

```bash
cd /path/to/my-project
claude
```

Claude Code 내에서 자연어로 사용 가능:

```
"task-001로 API 설계 작업을 생성해줘"
→ kanban_create_task 호출

"task-001 작업을 시작해"
→ kanban_send_event(type: "task.started", taskId: "task-001")

"현재 진행 중인 작업 목록 보여줘"
→ kanban_list_tasks(status: "doing")

"task-001 작업 완료 처리해"
→ kanban_send_event(type: "task.completed", taskId: "task-001")
```

#### 4. 팀 에이전트와 함께 사용하기

Claude Code의 팀 에이전트(subagent)들이 작업할 때 칸반 보드로 진행 상황을 추적할 수 있다.
CLAUDE.md 또는 프롬프트에 다음과 같이 지시:

```markdown
## 작업 추적 규칙
- 작업 시작 시 kanban_send_event(type: "task.started")를 호출할 것
- 작업 완료 시 kanban_send_event(type: "task.completed")를 호출할 것
- 작업 실패 시 kanban_send_event(type: "task.failed", message: "에러 내용")를 호출할 것
- 브라우저에서 http://localhost:5173 으로 실시간 진행 상황 확인 가능
```

이렇게 하면 여러 에이전트가 병렬로 작업하는 동안 칸반 보드에서 실시간으로 진행 상황을 모니터링할 수 있다.

## State Transitions

```
task.started  → todo/없음 → doing
task.completed → doing → done (failed=false)
task.failed    → doing → done (failed=true)
```
