"use client";

import { useState, useEffect } from "react";
import TaskFilters from "./TaskFilters";

interface KanbanControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddTask: () => void;
  totalTasks: number;
  priority: string;
  setPriority: (priority: string) => void;
  dueDate: string;
  setDueDate: (dueDate: string) => void;
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;
}

export default function KanbanControls({
  searchQuery,
  setSearchQuery,
  onAddTask,
  totalTasks,
  priority,
  setPriority,
  dueDate,
  setDueDate,
  showCompleted,
  setShowCompleted,
}: KanbanControlsProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const savedSearch = localStorage.getItem("kanbanSearchQuery");
    if (savedSearch) {
      setSearchQuery(savedSearch);
    }
  }, [setSearchQuery]);

  useEffect(() => {
    localStorage.setItem("kanbanSearchQuery", searchQuery);
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/5 rounded-xl 
                     text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                     focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-800/30 rounded-lg">
            <span className="text-sm text-slate-400">Total tasks:</span>
            <span className="text-sm font-medium text-white">{totalTasks}</span>
          </div>

          <button
            onClick={onAddTask}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                   active:bg-blue-800 text-white rounded-xl transition-all duration-200 
                   shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 
                   transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add Task</span>
          </button>
        </div>
      </div>
      <TaskFilters
        priority={priority}
        setPriority={setPriority}
        dueDate={dueDate}
        setDueDate={setDueDate}
        showCompleted={showCompleted}
        setShowCompleted={setShowCompleted}
      />
    </div>
  );
}