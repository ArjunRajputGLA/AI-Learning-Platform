"use client";

interface KanbanHeaderProps {
  title: string;
}

export default function KanbanHeader({ title }: KanbanHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center text-sm text-slate-400 mb-2">
        <span>Tasks</span>
        <svg className="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <span>Kanban Board</span>
      </div>
      <h1 className="text-3xl font-bold text-white">{title}</h1>
    </div>
  );
}