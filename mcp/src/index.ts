import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.KANBAN_API_BASE_URL ?? "http://localhost:3001";

const server = new McpServer({ name: "kanban-mcp", version: "0.1.0" });

server.tool(
  "kanban_create_task",
  "Create a new task in todo status",
  {
    taskId: z.string(),
    title: z.string(),
    assigneeAgent: z.string(),
  },
  async ({ taskId, title, assigneeAgent }) => {
    try {
      const res = await fetch(`${BASE_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, title, assigneeAgent }),
      });
      if (!res.ok) {
        const text = await res.text();
        return {
          content: [
            {
              type: "text",
              text: `Error creating task: ${res.status} ${text}`,
            },
          ],
        };
      }
      const task = await res.json();
      return {
        content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to reach server: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "kanban_send_event",
  "Send an event to change task status",
  {
    type: z.enum(["task.started", "task.completed", "task.failed"]),
    taskId: z.string(),
    message: z.string().optional(),
  },
  async ({ type, taskId, message }) => {
    try {
      const body: Record<string, unknown> = { type, taskId };
      if (message !== undefined) body.message = message;

      const res = await fetch(`${BASE_URL}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        return {
          content: [
            {
              type: "text",
              text: `Error sending event: ${res.status} ${text}`,
            },
          ],
        };
      }
      const task = await res.json();
      return {
        content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to reach server: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "kanban_list_tasks",
  "List all tasks, optionally filtered by status",
  {
    status: z.enum(["todo", "doing", "done"]).optional(),
  },
  async ({ status }) => {
    try {
      const res = await fetch(`${BASE_URL}/api/tasks`);
      if (!res.ok) {
        const text = await res.text();
        return {
          content: [
            {
              type: "text",
              text: `Error listing tasks: ${res.status} ${text}`,
            },
          ],
        };
      }
      let tasks: unknown[] = await res.json();
      if (status !== undefined) {
        tasks = (tasks as Array<{ status: string }>).filter(
          (t) => t.status === status
        );
      }
      return {
        content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to reach server: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "kanban_get_task",
  "Get a single task by ID",
  {
    taskId: z.string(),
  },
  async ({ taskId }) => {
    try {
      const res = await fetch(`${BASE_URL}/api/tasks`);
      if (!res.ok) {
        const text = await res.text();
        return {
          content: [
            {
              type: "text",
              text: `Error fetching tasks: ${res.status} ${text}`,
            },
          ],
        };
      }
      const tasks: Array<{ taskId: string }> = await res.json();
      const task = tasks.find((t) => t.taskId === taskId);
      if (!task) {
        return {
          content: [{ type: "text", text: "Task not found" }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to reach server: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
