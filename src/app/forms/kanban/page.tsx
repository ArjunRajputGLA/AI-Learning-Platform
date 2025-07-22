"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DragDropContext, DropResult, DragStart } from "@hello-pangea/dnd";
import { toast } from "react-hot-toast";
import KanbanColumn from "./KanbanColumn";
import KanbanHeader from "./KanbanHeader";
import KanbanControls from "./KanbanControls";
import AddTaskModal from "./AddTaskModal";
import { useSession } from "next-auth/react";

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

interface KanbanBoard {
  _id: { $oid: string };
  title: string;
  userId: { $oid: string };
  relatedTrack: { $oid: string } | null;
  columns: Column[];
  createdAt: { $date: string };
  updatedAt: { $date: string };
}

export default function KanbanBoard() {
  const { data: session } = useSession();
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [filteredBoard, setFilteredBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priority, setPriority] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const boardRef = useRef<HTMLDivElement>(null);
  const userId = session?.user?.id;

  const handleError = (error: any, fallbackMessage: string) => {
    const errorMessage = error?.message || fallbackMessage;
    toast.error(errorMessage, {
      duration: 3000,
      position: "bottom-right",
    });
    console.error(errorMessage, error);
  };

  const handleSuccess = (message: string) => {
    toast.success(message, {
      duration: 2000,
      position: "bottom-right",
    });
  };

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const res = await fetch(`/api/kanban?userId=${userId}`);
        const data = await res.json();
        if (res.ok) {
          setBoard(data);
          setFilteredBoard(data);
          localStorage.setItem("kanbanBoard", JSON.stringify(data));
        } else {
          setError(data.error || "Failed to fetch Kanban board");
        }
      } catch (err) {
        setError("Error fetching Kanban board");
        const cachedBoard = localStorage.getItem("kanbanBoard");
        if (cachedBoard) {
          setBoard(JSON.parse(cachedBoard));
          setFilteredBoard(JSON.parse(cachedBoard));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBoard();
  }, [userId]);

  useEffect(() => {
    if (!board) return;

    let filteredColumns = board.columns.map((column) => ({
      ...column,
      tasks: [...column.tasks],
    }));

    // Apply filters
    filteredColumns = filteredColumns.map((column) => ({
      ...column,
      tasks: column.tasks.filter((task) => {
        // Search filter
        const matchesSearch =
          !searchQuery ||
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchQuery.toLowerCase());

        // Priority filter
        const matchesPriority = !priority || task.priority === priority;

        // Due date filter
        let matchesDueDate = true;
        if (dueDate) {
          const today = new Date();
          const taskDate = task.dueDate ? new Date(task.dueDate.$date) : null;

          if (dueDate === "today") {
            matchesDueDate = taskDate?.toDateString() === today.toDateString();
          } else if (dueDate === "week") {
            const weekFromNow = new Date(today);
            weekFromNow.setDate(today.getDate() + 7);
            matchesDueDate = taskDate ? taskDate <= weekFromNow : false;
          } else if (dueDate === "overdue") {
            matchesDueDate = taskDate ? taskDate < today : false;
          }
        }

        // Completed filter
        const matchesCompleted = showCompleted || !task.completed;

        return (
          matchesSearch && matchesPriority && matchesDueDate && matchesCompleted
        );
      }),
    }));

    setFilteredBoard({ ...board, columns: filteredColumns });
  }, [board, searchQuery, priority, dueDate, showCompleted]);

  // Center the columns on initial load
  useEffect(() => {
    const centerColumns = () => {
      const container = boardRef.current;
      if (!container || !filteredBoard?.columns.length) return;

      const containerWidth = container.clientWidth;
      const totalColumnsWidth =
        filteredBoard.columns.length * 320 + // Each column is w-80 (320px)
        (filteredBoard.columns.length - 1) * 24; // gap-6 (24px) between columns

      // Calculate the scroll position to center the columns
      const scrollPosition = (totalColumnsWidth - containerWidth) / 2;
      container.scrollLeft = Math.max(0, scrollPosition);
    };

    centerColumns();

    // Recenter on window resize
    window.addEventListener("resize", centerColumns);
    return () => window.removeEventListener("resize", centerColumns);
  }, [filteredBoard]);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/kanban?userId=${userId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch board");

      setBoard(data);
      setFilteredBoard(data);
      localStorage.setItem("kanbanBoard", JSON.stringify(data));
    } catch (err) {
      handleError(err, "Error loading board");
      const cachedBoard = localStorage.getItem("kanbanBoard");
      if (cachedBoard) {
        setBoard(JSON.parse(cachedBoard));
        setFilteredBoard(JSON.parse(cachedBoard));
        toast.success("Loaded from cache", { icon: "📋" });
      }
    } finally {
      setLoading(false);
    }
  };

  const onDragStart = (start: DragStart) => {
    const scrollContainer = boardRef.current;
    if (!scrollContainer) return;

    const scrollSpeed = 10;
    let scrollInterval: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX } = e;
      const containerRect = scrollContainer.getBoundingClientRect();

      if (clientX < containerRect.left + 50) {
        clearInterval(scrollInterval);
        scrollInterval = setInterval(() => {
          scrollContainer.scrollLeft -= scrollSpeed;
        }, 20);
      } else if (clientX > containerRect.right - 50) {
        clearInterval(scrollInterval);
        scrollInterval = setInterval(() => {
          scrollContainer.scrollLeft += scrollSpeed;
        }, 20);
      } else {
        clearInterval(scrollInterval);
      }
    };

    const handleDragEnd = () => {
      clearInterval(scrollInterval);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination || !board) return;

    try {
      setIsUpdating(true);
      const res = await fetch("/api/kanban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          taskId: result.draggableId,
          sourceColumnId: source.droppableId,
          destinationColumnId: destination.droppableId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await fetchBoard();
      handleSuccess("Task moved successfully");
    } catch (err) {
      handleError(err, "Failed to move task");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    const hasVisited = localStorage.getItem("hasVisitedKanban");
    if (!hasVisited) {
      setIsFirstVisit(true);
      localStorage.setItem("hasVisitedKanban", "true");
    } else {
      setIsFirstVisit(false);
    }
  }, []);

  const handleWelcomeClose = useCallback(() => {
    setIsFirstVisit(false);
    setIsAddModalOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
          <span className="font-medium text-slate-300">
            Loading your board...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Animated background elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-drift absolute -left-1/2 -top-1/2 h-full w-full rounded-full bg-gradient-to-br from-blue-500/10 to-transparent blur-3xl" />
        <div className="animate-drift-slow absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full bg-gradient-to-br from-purple-500/10 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto h-[calc(100vh-2rem)] w-full max-w-[1800px] p-4 md:p-8">
        <div className="flex h-full flex-col rounded-2xl border border-white/5 bg-slate-900/50 shadow-2xl backdrop-blur-xl">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 rounded-t-2xl border-b border-white/5 bg-slate-900/95 px-6 py-4 backdrop-blur-sm">
            <KanbanHeader title={board?.title || "My Kanban Board"} />
            <KanbanControls
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onAddTask={() => setIsAddModalOpen(true)}
              totalTasks={
                board?.columns.reduce(
                  (acc, col) => acc + col.tasks.length,
                  0,
                ) || 0
              }
              priority={priority}
              setPriority={setPriority}
              dueDate={dueDate}
              setDueDate={setDueDate}
              showCompleted={showCompleted}
              setShowCompleted={setShowCompleted}
            />
          </div>

          <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            {!filteredBoard?.columns.length ||
            filteredBoard.columns.every((col) => !col.tasks.length) ? (
              <div className="grid flex-1 place-items-center">
                <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl bg-slate-800/50 p-8 text-center backdrop-blur-sm">
                  <svg
                    className="mb-4 h-16 w-16 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <p className="mb-2 text-2xl font-semibold text-slate-300">
                    No tasks found
                  </p>
                  <p className="mb-6 text-sm text-slate-400">
                    Get started by adding your first task
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="transform rounded-xl bg-blue-600 px-6 py-3 text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/30"
                  >
                    Add Your First Task
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={boardRef}
                className="scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-slate-800/50 flex flex-1 items-start justify-start gap-6 overflow-x-auto scroll-smooth p-6 transition-all duration-300 ease-in-out"
              >
                {filteredBoard?.columns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    fetchBoard={fetchBoard}
                    userId={userId}
                    onError={handleError}
                    onSuccess={handleSuccess}
                  />
                ))}
              </div>
            )}
          </DragDropContext>
        </div>

        {/* Welcome Modal */}
        {isFirstVisit ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-slate-800 p-6 shadow-2xl">
              <h2 className="mb-4 text-2xl font-bold text-white">
                Welcome to your Kanban Board!
              </h2>
              <p className="mb-6 text-slate-300">
                Get started by creating your first task. You can organize tasks
                by dragging them between columns.
              </p>
              <button
                onClick={handleWelcomeClose}
                className="w-full transform rounded-xl bg-blue-600 px-6 py-3 text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/30"
              >
                Get Started
              </button>
            </div>
          </div>
        ) : (
          <AddTaskModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            userId={userId}
            columnId="todo" // Add default column ID
            onTaskAdded={async (newTask) => {
              try {
                const res = await fetch("/api/kanban", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId,
                    columnId: "todo",
                    ...newTask,
                  }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                await fetchBoard();
                handleSuccess("Task added successfully");
                setIsAddModalOpen(false);
              } catch (err) {
                handleError(err, "Failed to add task");
              }
            }}
          />
        )}

        {/* Animations */}
        <style jsx global>{`
          @keyframes drift {
            0%,
            100% {
              transform: translate(0, 0) rotate(0deg);
            }
            50% {
              transform: translate(2%, 2%) rotate(5deg);
            }
          }
          @keyframes drift-slow {
            0%,
            100% {
              transform: translate(0, 0) rotate(0deg);
            }
            50% {
              transform: translate(-2%, -2%) rotate(-5deg);
            }
          }
          .animate-drift {
            animation: drift 20s ease-in-out infinite;
          }
          .animate-drift-slow {
            animation: drift-slow 25s ease-in-out infinite;
          }
          ::-webkit-scrollbar {
            height: 8px;
            width: 8px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(30, 41, 59, 0.5);
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.2);
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 130, 246, 0.4);
          }
        `}</style>
      </div>
    </div>
  );
}
