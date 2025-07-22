"use client";

import { useState, useEffect } from "react";

interface KanbanTask {
  id: string | { $oid: string };
  title: string;
  description: string;
  priority: string;
  dueDate: { $date: string } | null;
  completed: boolean;
  createdAt: { $date: string };
}

interface EditTaskModalProps {
  task: KanbanTask;
  columnId: string;
  onClose: () => void;
  onTaskUpdated: () => void;
  userId: string | undefined;
}

export default function EditTaskModal({ task, columnId, onClose, onTaskUpdated, userId }: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate.$date).toISOString().split("T")[0] : ""
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const draftKey = `editTaskDraft_${typeof task.id === "string" ? task.id : task.id.$oid}`;
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      const parsed = JSON.parse(draft);
      setTitle(parsed.title || task.title);
      setDescription(parsed.description || task.description);
      setPriority(parsed.priority || task.priority);
      setDueDate(parsed.dueDate || (task.dueDate ? new Date(task.dueDate.$date).toISOString().split("T")[0] : ""));
    }
  }, [task]);

  useEffect(() => {
    const draftKey = `editTaskDraft_${typeof task.id === "string" ? task.id : task.id.$oid}`;
    const draft = { title, description, priority, dueDate };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [title, description, priority, dueDate, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError("User ID is missing. Please log in.");
      return;
    }

    const taskId = typeof task.id === "string" ? task.id : task.id.$oid;
    const updatedTask = {
      userId,
      taskId,
      columnId,
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    };

    try {
      const res = await fetch("/api/kanban", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem(`editTaskDraft_${taskId}`);
        onTaskUpdated();
        onClose();
      } else {
        setError(data.error || "Failed to update task");
      }
    } catch (error) {
      setError("Error updating task");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
        handleSubmit(e as any);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [title, description, priority, dueDate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Edit Task</h2>
            <p className="text-slate-400 text-sm">Modify your task details below</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-2 hover:bg-slate-700 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {error && <p className="text-red-400 mb-4">{error}</p>}
          {/* Task Title */}
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-300 mb-3">
              Task Title
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              className="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 text-lg"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="task-description" className="block text-sm font-medium text-slate-300 mb-3">
              Description
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              className="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 text-lg"
              rows={3}
            />
          </div>

          {/* Priority and Due Date Row */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="task-priority" className="block text-sm font-medium text-slate-300 mb-3">
                Priority
              </label>
              <div className="relative">
                <select
                  id="task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white appearance-none cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div>
              <label htmlFor="task-due-date" className="block text-sm font-medium text-slate-300 mb-3">
                Due Date
              </label>
              <div className="relative">
                <input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
                <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Created At (Read-Only) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Created: {new Date(task.createdAt.$date).toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg"
            >
              Update Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}