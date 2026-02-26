import React from 'react';
import { useSSE } from '../hooks/useSSE';
import { KanbanColumn } from './KanbanColumn';

export function KanbanBoard() {
  const { todo, doing, done } = useSSE();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight">
            Agent Team Kanban
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Live task board — updates in real time via SSE
          </p>
        </div>

        {/* Board */}
        <div className="flex gap-6 items-start overflow-x-auto pb-4">
          <KanbanColumn title="Todo" tasks={todo} color="yellow-400" />
          <KanbanColumn title="Doing" tasks={doing} color="blue-400" />
          <KanbanColumn title="Done" tasks={done} color="green-400" />
        </div>
      </div>
    </div>
  );
}
