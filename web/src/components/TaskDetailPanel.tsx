import React, { useState, useEffect, useRef } from 'react';
import { Task, SubTask } from '../types';

const BASE_URL = '';

interface Props {
  task: Task;
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
}

const STATUS_LABEL: Record<string, string> = {
  todo: 'Todo',
  doing: 'Doing',
  done: 'Done',
};

const STATUS_COLOR: Record<string, string> = {
  todo: 'bg-yellow-500/20 text-yellow-300',
  doing: 'bg-blue-500/20 text-blue-300',
  done: 'bg-green-500/20 text-green-300',
};

const LOG_ICON: Record<string, string> = {
  status_change: '⟳',
  progress: '·',
  error: '✕',
  note: '✎',
};

const LOG_COLOR: Record<string, string> = {
  status_change: 'text-indigo-400',
  progress: 'text-gray-300',
  error: 'text-red-400',
  note: 'text-yellow-400',
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function newSubTask(text: string): SubTask {
  return {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    done: false,
    createdAt: new Date().toISOString(),
  };
}

async function patchTask(taskId: string, patch: { notes?: string; subTasks?: SubTask[] }): Promise<Task | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function TaskDetailPanel({ task, onClose, onTaskUpdated }: Props) {
  const [notes, setNotes] = useState(task.notes ?? '');
  const [subTasks, setSubTasks] = useState<SubTask[]>(task.subTasks ?? []);
  const [newSubText, setNewSubText] = useState('');
  const [saving, setSaving] = useState(false);
  const notesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Sync when task updates from SSE
  useEffect(() => {
    setNotes(task.notes ?? '');
    setSubTasks(task.subTasks ?? []);
  }, [task.taskId]);

  // Scroll log to bottom on open
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task.activityLog]);

  // Auto-save notes with debounce
  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(async () => {
      setSaving(true);
      const updated = await patchTask(task.taskId, { notes: val });
      if (updated) onTaskUpdated(updated);
      setSaving(false);
    }, 800);
  };

  const handleToggleSubTask = async (id: string) => {
    const updated = subTasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s));
    setSubTasks(updated);
    const result = await patchTask(task.taskId, { subTasks: updated });
    if (result) onTaskUpdated(result);
  };

  const handleAddSubTask = async () => {
    const text = newSubText.trim();
    if (!text) return;
    const updated = [...subTasks, newSubTask(text)];
    setSubTasks(updated);
    setNewSubText('');
    const result = await patchTask(task.taskId, { subTasks: updated });
    if (result) onTaskUpdated(result);
  };

  const handleDeleteSubTask = async (id: string) => {
    const updated = subTasks.filter((s) => s.id !== id);
    setSubTasks(updated);
    const result = await patchTask(task.taskId, { subTasks: updated });
    if (result) onTaskUpdated(result);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-700 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[task.status]}`}>
                {STATUS_LABEL[task.status]}
              </span>
              {task.failed && (
                <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-semibold">FAILED</span>
              )}
              <span className="text-xs text-indigo-400 bg-indigo-600/20 px-2 py-0.5 rounded-full truncate">
                {task.projectId}
              </span>
            </div>
            <h2 className="text-base font-semibold text-gray-100 leading-snug">{task.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">@{task.assigneeAgent}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl leading-none flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Activity Log */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Activity Log
            </h3>
            <div className="space-y-2">
              {(task.activityLog ?? []).length === 0 && (
                <p className="text-xs text-gray-600">No activity yet</p>
              )}
              {(task.activityLog ?? []).map((entry, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className={`text-sm font-bold flex-shrink-0 w-4 text-center ${LOG_COLOR[entry.type]}`}>
                    {LOG_ICON[entry.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-mono break-words ${LOG_COLOR[entry.type]}`}>
                      {entry.message}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">{formatDateTime(entry.timestamp)}</p>
                  </div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </section>

          {/* Notes */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Notes</h3>
              {saving && <span className="text-xs text-gray-500">저장 중...</span>}
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="메모를 입력하세요..."
              rows={4}
              className="w-full bg-gray-800 text-gray-200 text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-indigo-500 resize-none placeholder-gray-600"
            />
          </section>

          {/* Sub Tasks */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Sub Tasks</h3>
            <div className="space-y-2 mb-3">
              {subTasks.length === 0 && (
                <p className="text-xs text-gray-600">서브 태스크가 없습니다</p>
              )}
              {subTasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 group">
                  <input
                    type="checkbox"
                    checked={sub.done}
                    onChange={() => handleToggleSubTask(sub.id)}
                    className="w-4 h-4 accent-indigo-500 flex-shrink-0 cursor-pointer"
                  />
                  <span className={`flex-1 text-sm ${sub.done ? 'line-through text-gray-600' : 'text-gray-200'}`}>
                    {sub.text}
                  </span>
                  <button
                    onClick={() => handleDeleteSubTask(sub.id)}
                    className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubText}
                onChange={(e) => setNewSubText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask()}
                placeholder="새 서브 태스크 추가..."
                className="flex-1 bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500 placeholder-gray-600"
              />
              <button
                onClick={handleAddSubTask}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-2 rounded-lg transition-colors"
              >
                추가
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
