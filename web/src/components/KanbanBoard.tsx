import React, { useState, useCallback } from 'react';
import { Task } from '../types';
import { useSSE } from '../hooks/useSSE';
import { KanbanColumn } from './KanbanColumn';
import { ProjectTabs } from './ProjectTabs';
import { TaskDetailPanel } from './TaskDetailPanel';

export function KanbanBoard() {
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { grouped, projects, allTasks } = useSSE(selectedProject);

  const handleCardClick = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedTask(null);
  }, []);

  // Keep panel in sync with latest SSE data
  const handleTaskUpdated = useCallback((updated: Task) => {
    setSelectedTask((prev) => (prev?.taskId === updated.taskId ? updated : prev));
  }, []);

  // When SSE pushes an update, sync the panel if it's open
  const liveTask = selectedTask
    ? (allTasks.find((t) => t.taskId === selectedTask.taskId) ?? selectedTask)
    : null;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight">
            Agent Team Kanban
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Live task board — updates in real time via SSE
          </p>
        </div>

        {/* Project tabs */}
        <ProjectTabs
          projects={projects}
          selected={selectedProject}
          onSelect={setSelectedProject}
        />

        {/* Board */}
        <div className="flex gap-6 items-start overflow-x-auto pb-4">
          <KanbanColumn
            title="Todo"
            tasks={grouped.todo}
            color="yellow-400"
            onCardClick={handleCardClick}
          />
          <KanbanColumn
            title="Doing"
            tasks={grouped.doing}
            color="blue-400"
            onCardClick={handleCardClick}
          />
          <KanbanColumn
            title="Done"
            tasks={grouped.done}
            color="green-400"
            onCardClick={handleCardClick}
          />
        </div>
      </div>

      {/* Detail panel */}
      {liveTask && (
        <TaskDetailPanel
          task={liveTask}
          onClose={handleClose}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </div>
  );
}
