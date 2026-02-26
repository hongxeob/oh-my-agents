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

Claude Code에서 사용하려면 `.claude.json` 또는 MCP 설정에 추가:

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

### MCP Tools

| Tool | Description | Parameters |
|------|-------------|-----------|
| `kanban_create_task` | todo에 태스크 생성 | taskId, title, assigneeAgent |
| `kanban_send_event` | 이벤트 전송 (상태 변경) | type, taskId, message? |
| `kanban_list_tasks` | 전체 태스크 조회 | status? (필터) |
| `kanban_get_task` | 단일 태스크 조회 | taskId |

## State Transitions

```
task.started  → todo/없음 → doing
task.completed → doing → done (failed=false)
task.failed    → doing → done (failed=true)
```
# oh-my-agents
