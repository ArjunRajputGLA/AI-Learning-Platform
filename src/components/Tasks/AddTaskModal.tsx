"use client";

import { useState, useEffect } from "react";

interface Task {
  _id: string;
  title: string;
  priority: string;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (title: string, priority: string, dueDate: string) => Promise<void>;
  onEditTask?: (id: string, title: string, priority: string, dueDate: string, completed: boolean) => Promise<void>;
  taskToEdit?: Task | null;
}

export default function AddTaskModal({ isOpen, onClose, onAddTask, onEditTask, taskToEdit }: AddTaskModalProps) {
  const isEditMode = !!taskToEdit;
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (isEditMode && taskToEdit) {
      setTitle(taskToEdit.title);
      setPriority(taskToEdit.priority || "medium");
      setDueDate(taskToEdit.dueDate ? new Date(taskToEdit.dueDate).toISOString().split("T")[0] : "");
      setCompleted(taskToEdit.completed);
    } else {
      handleReset();
    }
  }, [isEditMode, taskToEdit]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    if (isEditMode && taskToEdit && onEditTask) {
      await onEditTask(taskToEdit._id, title, priority, dueDate, completed);
    } else {
      await onAddTask(title, priority, dueDate);
    }
    handleClose();
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setTitle("");
    setPriority("medium");
    setDueDate("");
    setCompleted(false);
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {isEditMode ? "Edit Task" : "Add a new task"}
            </h2>
            <p className="text-slate-400 text-sm">
              {isEditMode ? "Modify your task details below" : "Effortlessly manage your to-do list: add a new task"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-2 hover:bg-slate-700 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-6">
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

          {/* Priority, Due Date, and Completed Row */}
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
                  <option value="low" className="bg-slate-700">Low</option>
                  <option value="medium" className="bg-slate-700">Medium</option>
                  <option value="high" className="bg-slate-700">High</option>
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

          {/* Completed Checkbox */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
                className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500 bg-slate-700 border-slate-600"
              />
              Mark as Completed
            </label>
          </div>

          {/* Created At and Completed At (Read-Only) */}
          {isEditMode && taskToEdit && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Created: {new Date(taskToEdit.createdAt).toLocaleString()}</span>
              </div>
              {taskToEdit.completedAt && (
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Completed: {new Date(taskToEdit.completedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg"
            >
              {isEditMode ? "Update Task" : "Create Task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}