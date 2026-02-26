import React from 'react';
import { Task } from '../types';

interface Props {
  task: Task;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

export function TaskCard({ task }: Props) {
  const logs = task.recentLog.slice(0, 3);

  return (
    <div
      className={[
        'bg-gray-800 rounded-lg p-4 shadow transition-all duration-200',
        task.failed ? 'border-l-4 border-red-500' : 'border-l-4 border-transparent',
      ].join(' ')}
    >
      {/* Top row: agent badge + failed badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="bg-indigo-600/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full truncate max-w-[70%]">
          {task.assigneeAgent}
        </span>
        {task.failed && (
          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-semibold tracking-wide">
            FAILED
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-gray-100 mb-3 leading-snug">{task.title}</p>

      {/* Log lines */}
      {logs.length > 0 && (
        <div className="mb-2 space-y-0.5">
          {logs.map((line, i) => (
            <p key={i} className="text-xs text-gray-400 font-mono truncate">
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Error message */}
      {task.failed && task.errorMessage && (
        <p className="text-xs text-red-400 mt-1 mb-2 font-mono break-words">
          {task.errorMessage}
        </p>
      )}

      {/* Footer: timestamp */}
      <div className="flex items-center justify-end mt-2 pt-2 border-t border-gray-700/50">
        <span className="text-xs text-gray-500">{formatTime(task.updatedAt)}</span>
      </div>
    </div>
  );
}
