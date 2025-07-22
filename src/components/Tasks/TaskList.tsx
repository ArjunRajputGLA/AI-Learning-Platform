"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import AddTaskModal from "./AddTaskModal";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface Task {
  _id: string;
  userId: string;
  title: string;
  completed: boolean;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  description?: string;
}

export default function TaskList() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isFilterSortOpen, setIsFilterSortOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("createdAt-desc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const filterSortRef = useRef<HTMLDivElement>(null);

  // Load search query from localStorage on mount
  useEffect(() => {
    const savedSearch = localStorage.getItem("todoSearchQuery");
    if (savedSearch) {
      setSearchQuery(savedSearch);
    }
  }, []);

  // Persist search query to localStorage
  useEffect(() => {
    localStorage.setItem("todoSearchQuery", searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchTasks();
    }
  }, [session]);

  // Handle click outside to close the filter panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterSortRef.current && !filterSortRef.current.contains(event.target as Node)) {
        setIsFilterSortOpen(false);
      }
    };

    if (isFilterSortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterSortOpen]);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?userId=${session?.user?.id}`);
      
      if (!res.ok) {
        console.error('Failed to fetch tasks:', res.status, res.statusText);
        return;
      }
      
      const text = await res.text();
      if (!text) {
        setTasks([]);
        return;
      }
      
      const data = JSON.parse(text);
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    }
  };

  const addTask = async (title: string, priority: string, dueDate: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id,
          title,
          priority,
          dueDate,
          completed: false,
        }),
      });

      if (res.ok) {
        fetchTasks();
      } else {
        console.error('Failed to add task:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const editTask = async (id: string, title: string, priority: string, dueDate: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          priority,
          dueDate,
          completed,
        }),
      });

      if (res.ok) {
        fetchTasks();
      } else {
        console.error('Failed to update task:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    try {
      await fetch(`/api/tasks?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          completed: !completed,
        }),
      });
      fetchTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await fetch(`/api/tasks?id=${id}`, {
        method: "DELETE",
      });
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
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

  const applyFiltersAndSort = (taskList: Task[]) => {
    let filteredTasks = [...taskList];

    // Apply search filter
    if (searchQuery) {
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply priority filter
    if (priorityFilter !== "all") {
      filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
    }

    // Apply tab filter (All, To Do, Completed)
    switch (activeTab) {
      case "todo":
        filteredTasks = filteredTasks.filter(task => !task.completed);
        break;
      case "completed":
        filteredTasks = filteredTasks.filter(task => task.completed);
        break;
      default:
        break;
    }

    // Apply sorting
    const [sortField, sortDirection] = sortOption.split("-");
    filteredTasks.sort((a, b) => {
      if (sortField === "dueDate") {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortField === "createdAt") {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortField === "priority") {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityA = priorityOrder[a.priority] || 0;
        const priorityB = priorityOrder[b.priority] || 0;
        return sortDirection === "asc" ? priorityA - priorityB : priorityB - priorityA;
      }
      return 0;
    });

    return filteredTasks;
  };

  const filteredAndSortedTasks = applyFiltersAndSort(tasks);
  const todoCount = applyFiltersAndSort(tasks).filter(task => !task.completed).length;
  const completedCount = applyFiltersAndSort(tasks).filter(task => task.completed).length;

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const onDragEnd = (result: any) => {
    const { source, destination } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const draggedTask = tasks.find(task => task._id === result.draggableId);
    if (!draggedTask) return;

    const newCompletedStatus = destination.droppableId === "completed";
    if (draggedTask.completed !== newCompletedStatus) {
      toggleTask(draggedTask._id, draggedTask.completed);
    }
  };

  const handlePriorityChange = (priority: string) => {
    if (priorityFilter === priority) {
      setPriorityFilter("all"); // Deselect if the same priority is clicked
    } else {
      setPriorityFilter(priority);
    }
  };

  const clearFilter = () => {
    setPriorityFilter("all");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center text-sm text-slate-400 mb-2">
              <span>Tasks</span>
              <svg className="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span>Task List</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Task List</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="relative w-5/9">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full py-2 px-4 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 text-lg"
              />
              <svg
                className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                  isSearchFocused ? "text-blue-500" : "text-slate-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="relative" ref={filterSortRef}>
              <button
                onClick={() => setIsFilterSortOpen(!isFilterSortOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-700 text-slate-200 rounded-xl hover:from-slate-700 hover:to-slate-600 transition-all duration-300 transform hover:scale-105 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
                Filter & Sort
              </button>
              {isFilterSortOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl p-5 z-20 border border-slate-700/50 transition-all duration-300">
                  {/* Filter by Priority */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Filter by Priority
                    </h3>
                    <div className="space-y-3">
                      {["all", "low", "medium", "high"].map((priority) => (
                        <label
                          key={priority}
                          className={`flex items-center gap-2 text-sm text-slate-300 cursor-pointer p-2 rounded-lg hover:bg-slate-700/50 transition-colors ${
                            priorityFilter === priority ? "bg-slate-700/70" : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name="priority-filter"
                            value={priority}
                            checked={priorityFilter === priority}
                            onChange={() => handlePriorityChange(priority)}
                            className="text-blue-500 focus:ring-blue-500 bg-slate-700 border-slate-600"
                          />
                          <span className="flex items-center gap-2">
                            {priority === "all" && (
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                            )}
                            {priority === "low" && (
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                            {priority === "medium" && (
                              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5h6m-6 14h6" />
                              </svg>
                            )}
                            {priority === "high" && (
                              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                              </svg>
                            )}
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7m-9-4h-2m-6 4h12" />
                      </svg>
                      Sort By
                    </h3>
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className="w-full p-2 bg-gradient-to-r from-blue-900/30 to-slate-800/30 border border-blue-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 text-slate-100 text-sm"
                    >
                      <option className="bg-slate-800 hover:bg-blue-700/20 text-slate-100" value="createdAt-desc">Created Date (Newest First)</option>
                      <option className="bg-slate-800 hover:bg-blue-700/20 text-slate-100" value="createdAt-asc">Created Date (Oldest First)</option>
                      <option className="bg-slate-800 hover:bg-blue-700/20 text-slate-100" value="dueDate-asc">Due Date (Earliest First)</option>
                      <option className="bg-slate-800 hover:bg-blue-700/20 text-slate-100" value="dueDate-desc">Due Date (Latest First)</option>
                      <option className="bg-slate-800 hover:bg-blue-700/20 text-slate-100" value="priority-desc">Priority (High to Low)</option>
                      <option className="bg-slate-800 hover:bg-blue-700/20 text-slate-100" value="priority-asc">Priority (Low to High)</option>
                    </select>
                  </div>

                  {/* Clear Filter Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={clearFilter}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear Filter
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add New Task
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "all" 
                ? "text-white border-blue-500" 
                : "text-slate-400 border-transparent hover:text-slate-300"
            }`}
          >
            All Tasks
            <span className="ml-2 px-2 py-1 text-xs bg-slate-700 rounded-full">{filteredAndSortedTasks.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("todo")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "todo" 
                ? "text-white border-blue-500" 
                : "text-slate-400 border-transparent hover:text-slate-300"
            }`}
          >
            To Do
            <span className="ml-2 px-2 py-1 text-xs bg-slate-700 rounded-full">{todoCount}</span>
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "completed" 
                ? "text-white border-blue-500" 
                : "text-slate-400 border-transparent hover:text-slate-300"
            }`}
          >
            Completed
            <span className="ml-2 px-2 py-1 text-xs bg-slate-700 rounded-full">{completedCount}</span>
          </button>
        </div>

        {/* Task Sections */}
        {activeTab === "all" ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="space-y-8">
              {/* To Do Section */}
              {todoCount > 0 && (
                <Droppable droppableId="todo">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 p-4 rounded-lg ${
                        snapshot.isDraggingOver ? "border-2 border-blue-500 bg-slate-700/50" : "border border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-lg font-semibold text-white">To Do</h2>
                        <span className="text-sm text-slate-400">{todoCount}</span>
                        <button className="ml-auto text-slate-400 hover:text-slate-300">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-3">
                        {filteredAndSortedTasks.filter(task => !task.completed).map((task, index) => (
                          <Draggable key={task._id} draggableId={task._id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TaskItem 
                                  task={task} 
                                  onToggle={toggleTask}
                                  onDelete={deleteTask}
                                  onEdit={handleEditTask}
                                  getPriorityColor={getPriorityColor}
                                  session={session}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              )}

              {/* Completed Section */}
              {completedCount > 0 && (
                <Droppable droppableId="completed">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 p-4 rounded-lg ${
                        snapshot.isDraggingOver ? "border-2 border-blue-500 bg-slate-700/50" : "border border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-lg font-semibold text-white">Completed</h2>
                        <span className="text-sm text-slate-400">{completedCount}</span>
                        <button className="ml-auto text-slate-400 hover:text-slate-300">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-3">
                        {filteredAndSortedTasks.filter(task => task.completed).map((task, index) => (
                          <Draggable key={task._id} draggableId={task._id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TaskItem 
                                  task={task} 
                                  onToggle={toggleTask}
                                  onDelete={deleteTask}
                                  onEdit={handleEditTask}
                                  getPriorityColor={getPriorityColor}
                                  session={session}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          </DragDropContext>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedTasks.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                No tasks in this category yet.
              </div>
            ) : (
              filteredAndSortedTasks.map((task) => (
                <TaskItem 
                  key={task._id} 
                  task={task} 
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onEdit={handleEditTask}
                  getPriorityColor={getPriorityColor}
                  session={session}
                />
              ))
            )}
          </div>
        )}

        {/* Add/Edit Task Modal */}
        <AddTaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setTaskToEdit(null);
            setIsModalOpen(false);
          }}
          onAddTask={addTask}
          onEditTask={editTask}
          taskToEdit={taskToEdit}
        />
      </div>
    </div>
  );
}

// Task Item Component
function TaskItem({ task, onToggle, onDelete, onEdit, getPriorityColor, session }) {
  return (
    <div className="flex items-center p-4 bg-slate-800 rounded-lg hover:bg-slate-750 transition-colors group">
      <div className="flex items-center justify-center w-6 h-6 mr-4">
        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </div>
      
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task._id, task.completed)}
        className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500 bg-slate-700 border-slate-600 mr-4"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className={`text-base font-medium truncate ${
            task.completed 
              ? "line-through text-slate-500" 
              : "text-white"
          }`}>
            {task.title}
          </h3>
          
          {task.priority && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-slate-400">
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
          </div>

          {task.completed && task.completedAt && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Completed: {new Date(task.completedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-4">
        <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
          <span className="text-xs font-medium text-slate-300">
            {session?.user?.name?.charAt(0) || "U"}
          </span>
        </div>
        
        <button
          onClick={() => onEdit(task)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-400 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        
        <button
          onClick={() => onDelete(task._id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}