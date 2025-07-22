"use client";

import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { toast } from "react-hot-toast";
import EditTaskModal from "./EditTaskModal";

interface KanbanTask {
  id: { $oid: string } | string;
  title: string;
  description: string;
  priority: string;
  dueDate: { $date: string } | null;
  completed: boolean;
  createdAt: { $date: string };
}

interface KanbanTaskProps {
  task: KanbanTask;
  index: number;
  columnId: string;
  onTaskUpdated: () => void;
  userId: string | undefined;
}

export default function KanbanTask({ task, index, columnId, onTaskUpdated, userId }: KanbanTaskProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No Due Date";
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  };

  const handleDelete = async () => {
    if (!userId) {
      toast.error("User ID is missing. Please log in.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      setIsDeleting(true);
      const taskId = typeof task.id === "string" ? task.id : task.id.$oid;
      const res = await fetch("/api/kanban", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          taskId,
          columnId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete task");
      }

      toast.success("Task deleted successfully");
      onTaskUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete task";
      toast.error(message);
      console.error("Error deleting task:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (updatedData: {
    title: string;
    description: string;
    priority: string;
    dueDate?: string;
  }) => {
    if (!userId) {
      toast.error("User ID is missing. Please log in.");
      return;
    }

    try {
      setIsUpdating(true);
      const taskId = typeof task.id === "string" ? task.id : task.id.$oid;

      // Format the request data
      const requestData = {
        userId,
        taskId,
        columnId,
        ...updatedData,
        // Ensure dueDate is properly formatted or null
        dueDate: updatedData.dueDate || null,
      };

      const res = await fetch("/api/kanban", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update task");
      }

      toast.success("Task updated successfully");
      onTaskUpdated();
      setIsEditModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update task";
      toast.error(message);
      console.error("Error updating task:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return {
          dot: "bg-gradient-to-r from-[#EF4444] to-[#DC2626] shadow-[0_0_8px_rgba(239,68,68,0.5)]",
          badge: "bg-gradient-to-r from-[#EF4444] to-[#DC2626] shadow-[0_0_8px_rgba(239,68,68,0.3)]",
        };
      case "medium":
        return {
          dot: "bg-gradient-to-r from-[#F59E0B] to-[#D97706] shadow-[0_0_8px_rgba(245,158,11,0.5)]",
          badge: "bg-gradient-to-r from-[#F59E0B] to-[#D97706] shadow-[0_0_8px_rgba(245,158,11,0.3)]",
        };
      case "low":
        return {
          dot: "bg-gradient-to-r from-[#2DD4BF] to-[#14B8A6] shadow-[0_0_8px_rgba(45,212,191,0.5)]",
          badge: "bg-gradient-to-r from-[#2DD4BF] to-[#14B8A6] shadow-[0_0_8px_rgba(45,212,191,0.3)]",
        };
      default:
        return {
          dot: "bg-gradient-to-r from-[#6B7280] to-[#4B5563] shadow-[0_0_8px_rgba(107,114,128,0.5)]",
          badge: "bg-gradient-to-r from-[#6B7280] to-[#4B5563] shadow-[0_0_8px_rgba(107,114,128,0.3)]",
        };
    }
  };

  const priorityStyles = getPriorityColor(task.priority);

  return (
    <Draggable draggableId={typeof task.id === "string" ? task.id : task.id.$oid} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`relative backdrop-blur-lg bg-[#2D3748]/20 border border-white/30 rounded-xl p-4 mb-4 shadow-xl transition-all duration-300 group overflow-hidden
            hover:shadow-2xl hover:bg-[#2D3748]/30 hover:border-white/50 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]
            ${snapshot.isDragging ? "scale-105 rotate-3 shadow-2xl bg-[#2D3748]/30 border-white/50" : ""} cursor-grab active:cursor-grabbing`}
          style={{
            backgroundImage: "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.05) 0%, transparent 50%)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 group-hover:opacity-75 transition-opacity duration-300" />

          <div className="relative flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-full ${priorityStyles.dot} transform transition-transform group-hover:scale-125 group-hover:shadow-[0_0_12px_rgba(255,255,255,0.5)]`}
                title={`Priority: ${task.priority}`}
              />
              <h4 className="text-sm font-bold text-white leading-snug pr-3 line-clamp-1 drop-shadow-md">
                {task.title}
              </h4>
            </div>
            <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={() => setIsEditModalOpen(true)}
                disabled={isDeleting || isUpdating}
                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                title="Edit Task"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || isUpdating}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                title="Delete Task"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>

          {task.description && (
            <p className="relative text-gray-400 text-xs mb-3 line-clamp-2 drop-shadow-sm">
              {task.description}
            </p>
          )}

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              {task.dueDate && (
                <div className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-xs font-medium">{formatDate(task.dueDate.$date)}</span>
                </div>
              )}
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${priorityStyles.badge} text-white transform transition-transform group-hover:scale-105 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.4)]`}
            >
              {task.priority}
            </span>
          </div>

          {isEditModalOpen && (
            <EditTaskModal
              task={task}
              onClose={() => setIsEditModalOpen(false)}
              onSubmit={handleUpdate}
              isSubmitting={isUpdating}
            />
          )}
        </div>
      )}
    </Draggable>
  );
}