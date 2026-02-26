import React from 'react';
import { Task } from '../types';
import { TaskCard } from './TaskCard';

interface Props {
  title: string;
  tasks: Task[];
  color: 'yellow-400' | 'blue-400' | 'green-400';
}

export function KanbanColumn({ title, tasks, color }: Props) {
  const dotClassMap: Record<string, string> = {
    'yellow-400': 'bg-yellow-400',
    'blue-400': 'bg-blue-400',
    'green-400': 'bg-green-400',
  };

  return (
    <div className="flex-1 min-w-[300px] flex flex-col">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-3 h-3 rounded-full ${dotClassMap[color]} flex-shrink-0`} />
        <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
        <span className="bg-gray-700 text-gray-300 text-sm px-2 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-3 overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-700 p-6 text-center text-sm text-gray-600">
            No tasks
          </div>
        ) : (
          tasks.map((task) => <TaskCard key={task.taskId} task={task} />)
        )}
      </div>
    </div>
  );
}
