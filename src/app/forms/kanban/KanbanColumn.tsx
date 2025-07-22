"use client";

import { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
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

interface Column {
  id: string;
  title: string;
  tasks: KanbanTask[];
}

interface KanbanColumnProps {
  column: Column;
  fetchBoard: () => Promise<void>;
  userId: string;
}

export default function KanbanColumn({ column, fetchBoard, userId }: KanbanColumnProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);

  const handleDelete = async (taskId: string) => {
    try {
      const res = await fetch("/api/kanban", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, taskId, columnId: column.id }),
      });

      if (res.ok) {
        fetchBoard();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-400 bg-red-900/20";
      case "medium": return "text-yellow-400 bg-yellow-900/20";
      case "low": return "text-green-400 bg-green-900/20";
      default: return "text-gray-400 bg-gray-900/20";
    }
  };

  return (
    <div className="flex-shrink-0 w-80">
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`space-y-3 p-4 rounded-lg border border-slate-700 ${
              snapshot.isDraggingOver ? "border-2 border-blue-500 bg-slate-700/50" : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-white">{column.title}</h2>
              <span className="text-sm text-slate-400">{column.tasks.length}</span>
              <button className="ml-auto text-slate-400 hover:text-slate-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {column.tasks.map((task, index) => {
                const taskId = typeof task.id === "string" ? task.id : task.id.$oid;
                return (
                  <Draggable key={taskId} draggableId={taskId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`flex items-center p-4 bg-slate-800 rounded-lg hover:bg-slate-750 transition-colors group ${
                          snapshot.isDragging ? "border-2 border-blue-500" : ""
                        }`}
                      >
                        <div className="flex items-center justify-center w-6 h-6 mr-4">
                          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-base font-medium text-white truncate">
                              {task.title}
                            </h3>
                            {task.priority && (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-slate-400 text-sm mt-1 truncate">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            {task.dueDate && (
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{new Date(task.dueDate.$date).toLocaleDateString()}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Created: {new Date(task.createdAt.$date).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setIsEditModalOpen(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-400 transition-all"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(taskId)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
      {isEditModalOpen && selectedTask && (
        <EditTaskModal
          task={selectedTask}
          columnId={column.id}
          onClose={() => setIsEditModalOpen(false)}
          onTaskUpdated={fetchBoard}
          userId={userId}
        />
      )}
    </div>
  );
}