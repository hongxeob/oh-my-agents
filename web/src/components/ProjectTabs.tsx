import React from 'react';

interface Props {
  projects: string[];
  selected: string | undefined;
  onSelect: (projectId: string | undefined) => void;
}

function tabClass(active: boolean): string {
  return [
    'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
    active ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
  ].join(' ');
}

export function ProjectTabs({ projects, selected, onSelect }: Props) {
  if (projects.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      <button onClick={() => onSelect(undefined)} className={tabClass(selected === undefined)}>
        All
      </button>
      {projects.map((p) => (
        <button key={p} onClick={() => onSelect(p)} className={tabClass(selected === p)}>
          {p}
        </button>
      ))}
    </div>
  );
}
