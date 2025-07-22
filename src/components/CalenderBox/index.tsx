"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";

const CalendarBox = ({ email }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    priority: 'medium',
    dueDate: '',
    completed: false
  });

  // Fetch tasks from MongoDB when component mounts or email changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (!email) {
        console.log("No email provided");
        setLoading(false);
        return;
      }
  
      try {
        setLoading(true);
        console.log("Fetching tasks for email:", email);
        
        const requestBody = { 
          action: 'getTasks',
          email: email 
        };
        
        const response = await fetch('/api/calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Response error:", errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      
        const data = await response.json();
        setTasks(data.tasks || []);
        setError(null);
        
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError(`Failed to load tasks: ${err.message}`);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [email]);

  // Handle task operations (create, update, delete)
  const handleTaskOperation = async (action, taskData) => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          email,
          task: taskData
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      
      if (action === 'createTask') {
        setTasks([...tasks, data.task]);
        setIsAddTaskModalOpen(false);
        setNewTask({ title: '', priority: 'medium', dueDate: '', completed: false });
      } else if (action === 'updateTask') {
        setTasks(tasks.map(t => t._id === taskData._id ? { ...t, ...taskData } : t));
        closeModal();
      } else if (action === 'deleteTask') {
        setTasks(tasks.filter(t => t._id !== taskData._id));
        closeModal();
      }

      return data;
    } catch (err) {
      setError(`Failed to ${action}: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Handle add task form submission
  const handleAddTask = async (e) => {
    e.preventDefault();
    await handleTaskOperation('createTask', newTask);
  };

  // Handle task updates
  const handleUpdateTask = async (updatedTask) => {
    await handleTaskOperation('updateTask', updatedTask);
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId) => {
    await handleTaskOperation('deleteTask', { _id: taskId });
  };

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of the month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Get previous month's last days to fill the calendar
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
  
  // Generate calendar days
  const calendarDays = [];
  
  // Previous month's trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthLastDay - i,
      isCurrentMonth: false,
      date: new Date(currentYear, currentMonth - 1, prevMonthLastDay - i)
    });
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      date: new Date(currentYear, currentMonth, day)
    });
  }
  
  // Next month's leading days to complete the grid (42 days total - 6 weeks)
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(currentYear, currentMonth + 1, day)
    });
  }

  // Group calendar days into weeks
  const calendarWeeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    calendarWeeks.push(calendarDays.slice(i, i + 7));
  }

  // Function to get tasks for a specific date
  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      
      const taskDate = new Date(task.dueDate);
      const targetDate = new Date(date);
      
      return (
        taskDate.getDate() === targetDate.getDate() &&
        taskDate.getMonth() === targetDate.getMonth() &&
        taskDate.getFullYear() === targetDate.getFullYear()
      );
    });
  };

  // Debug logging to check tasks
  useEffect(() => {
    if (tasks.length > 0) {
      console.log('Filtered tasks:', tasks.filter(t => t.dueDate));
    }
  }, [tasks]);

  // Enhanced priority styling with colors
  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'high': 
        return {
          color: 'bg-red-500',
          textColor: 'text-red-600 dark:text-red-400',
          borderColor: 'border-red-500',
          bgColor: 'bg-red-50/50 dark:bg-red-900/10',
          dotColor: 'bg-red-500',
          label: 'High Priority'
        };
      case 'medium': 
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-600 dark:text-yellow-400',
          borderColor: 'border-yellow-500',
          bgColor: 'bg-yellow-50/50 dark:bg-yellow-900/10',
          dotColor: 'bg-yellow-500',
          label: 'Medium Priority'
        };
      case 'low': 
        return {
          color: 'bg-green-500',
          textColor: 'text-green-600 dark:text-green-400',
          borderColor: 'border-green-500',
          bgColor: 'bg-green-50/50 dark:bg-green-900/10',
          dotColor: 'bg-green-500',
          label: 'Low Priority'
        };
      default: 
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-600 dark:text-blue-400',
          borderColor: 'border-blue-500',
          bgColor: 'bg-blue-50/50 dark:bg-blue-900/10',
          dotColor: 'bg-blue-500',
          label: 'Normal Priority'
        };
    }
  };

  // Handle task click
  const handleTaskClick = (task, e) => {
    e.stopPropagation();
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsTaskModalOpen(false);
    setTimeout(() => setSelectedTask(null), 300);
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <>
      <div className="relative w-full max-w-7xl mx-auto rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        {/* Calendar Header with Navigation */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-primary to-primary/90 text-white rounded-t-[10px]">
          <button 
            onClick={goToPreviousMonth}
            className="p-3 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110 text-lg"
          >
            ←
          </button>
          <h2 className="text-2xl font-semibold">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button 
            onClick={goToNextMonth}
            className="p-3 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110 text-lg"
          >
            →
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading tasks...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Calendar Grid */}
        {!loading && (
          <table className="w-full">
            <thead>
              <tr className="grid grid-cols-7 bg-gradient-to-r from-primary to-primary/90 text-white">
                <th className="flex h-16 items-center justify-center p-2 text-sm font-medium sm:text-base xl:p-6">
                  <span className="hidden lg:block">Sunday</span>
                  <span className="block lg:hidden">Sun</span>
                </th>
                <th className="flex h-16 items-center justify-center p-2 text-sm font-medium sm:text-base xl:p-6">
                  <span className="hidden lg:block">Monday</span>
                  <span className="block lg:hidden">Mon</span>
                </th>
                <th className="flex h-16 items-center justify-center p-2 text-sm font-medium sm:text-base xl:p-6">
                  <span className="hidden lg:block">Tuesday</span>
                  <span className="block lg:hidden">Tue</span>
                </th>
                <th className="flex h-16 items-center justify-center p-2 text-sm font-medium sm:text-base xl:p-6">
                  <span className="hidden lg:block">Wednesday</span>
                  <span className="block lg:hidden">Wed</span>
                </th>
                <th className="flex h-16 items-center justify-center p-2 text-sm font-medium sm:text-base xl:p-6">
                  <span className="hidden lg:block">Thursday</span>
                  <span className="block lg:hidden">Thu</span>
                </th>
                <th className="flex h-16 items-center justify-center p-2 text-sm font-medium sm:text-base xl:p-6">
                  <span className="hidden lg:block">Friday</span>
                  <span className="block lg:hidden">Fri</span>
                </th>
                <th className="flex h-16 items-center justify-center rounded-tr-[10px] p-2 text-sm font-medium sm:text-base xl:p-6">
                  <span className="hidden lg:block">Saturday</span>
                  <span className="block lg:hidden">Sat</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {calendarWeeks.map((week, weekIndex) => (
                <tr key={weekIndex} className="grid grid-cols-7">
                  {week.map((dayObj, dayIndex) => {
                    const dayTasks = getTasksForDate(dayObj.date);
                    const isFirstWeek = weekIndex === 0;
                    const isLastWeek = weekIndex === calendarWeeks.length - 1;
                    const isFirstDay = dayIndex === 0;
                    const isLastDay = dayIndex === 6;
                    
                    let roundedClasses = '';
                    if (isLastWeek && isFirstDay) roundedClasses += ' rounded-bl-[10px]';
                    if (isLastWeek && isLastDay) roundedClasses += ' rounded-br-[10px]';

                    return (
                      <td 
                        key={`${weekIndex}-${dayIndex}`}
                        className={`ease relative h-32 cursor-pointer border border-stroke p-3 transition duration-300 hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2/50 md:h-40 md:p-4 xl:h-44 xl:p-5 group${roundedClasses}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-lg font-semibold ${dayObj.isCurrentMonth ? 'text-dark dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                            {dayObj.day}
                          </span>
                          {dayTasks.length > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                              <span className="text-xs font-medium text-primary">
                                {dayTasks.length}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Enhanced Tasks Display */}
                        {dayTasks.length > 0 && (
                          <div className="space-y-1.5 overflow-hidden">
                            {dayTasks.slice(0, 3).map((task, taskIndex) => {
                              const priorityConfig = getPriorityConfig(task.priority);
                              return (
                                <div
                                  key={task._id}
                                  onClick={(e) => handleTaskClick(task, e)}
                                  className={`relative flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 ${
                                    task.completed 
                                      ? 'bg-gray-100 dark:bg-gray-800/50 opacity-80' 
                                      : priorityConfig.bgColor
                                  } animate-fadeInUp`}
                                  style={{
                                    animationDelay: `${taskIndex * 0.1}s`
                                  }}
                                  title={task.title}
                                >
                                  <div className={`w-2 h-2 rounded-full ${priorityConfig.dotColor}`}></div>
                                  <div className="flex-1 truncate">
                                    <span className={`text-xs font-medium ${
                                      task.completed 
                                        ? 'line-through text-gray-500 dark:text-gray-400' 
                                        : 'text-gray-800 dark:text-gray-200'
                                    }`}>
                                      {task.title}
                                    </span>
                                  </div>
                                  {task.completed && (
                                    <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-[8px]">✓</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            
                            {dayTasks.length > 3 && (
                              <div className="text-xs text-center py-1 px-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-full text-gray-600 dark:text-gray-400 hover:bg-primary/20 hover:text-primary cursor-pointer transition-all duration-200">
                                +{dayTasks.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Floating Action Button for Add Task */}
        <button
          onClick={() => setIsAddTaskModalOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all duration-300 hover:scale-110 animate-pulse-subtle z-50"
          title="Add New Task"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Add Task Modal */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-lg rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slideUp">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Add New Task</h3>
            <form onSubmit={handleAddTask} className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="peer w-full px-4 py-3 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 animate-slideInRight"
                  required
                />
                <label
                  htmlFor="title"
                  className="absolute left-4 top-3 text-gray-500 dark:text-gray-400 transition-all duration-300 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-xs"
                >
                  Title
                </label>
              </div>
              <div className="relative pt-4">
                <label
                  htmlFor="dueDate"
                  className="absolute -top-2 left-4 px-1 bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400"
                >
                  Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full px-4 py-3 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 animate-slideInRight"
                  required
                  style={{ animationDelay: '0.1s' }}
                />
              </div>
              <div className="relative">
                <select
                  id="priority"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="peer w-full px-4 py-3 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 animate-slideInRight appearance-none"
                  style={{ animationDelay: '0.2s' }}
                >
                  <option value="low" className="text-green-600">Low</option>
                  <option value="medium" className="text-yellow-600">Medium</option>
                  <option value="high" className="text-red-600">High</option>
                </select>
                <label
                  htmlFor="priority"
                  className="absolute left-4 top-3 text-gray-500 dark:text-gray-400 transition-all duration-300 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-xs"
                >
                  Priority
                </label>
                <svg className="absolute right-4 top-4 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className="flex items-center gap-3 animate-slideInRight" style={{ animationDelay: '0.3s' }}>
                <input
                  type="checkbox"
                  id="completed"
                  checked={newTask.completed}
                  onChange={(e) => setNewTask({ ...newTask, completed: e.target.checked })}
                  className="w-5 h-5 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="completed" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Completed
                </label>
              </div>
              <div className="flex justify-end gap-3 animate-slideInRight" style={{ animationDelay: '0.4s' }}>
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-all duration-300"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Task Detail Modal */}
      {isTaskModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={closeModal}
        >
          <div 
            className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-lg rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedTask && (
              <>
                {/* Enhanced Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getPriorityConfig(selectedTask.priority).dotColor}`}></div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedTask.title}
                      </h3>
                    </div>
                    <p className={`text-sm font-medium ${getPriorityConfig(selectedTask.priority).textColor}`}>
                      {getPriorityConfig(selectedTask.priority).label}
                    </p>
                  </div>
                  <button 
                    onClick={closeModal}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full p-2 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Enhanced Form */}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateTask(selectedTask);
                }} className="space-y-6">
                  <div className="relative">
                    <input
                      type="text"
                      id="edit-title"
                      value={selectedTask.title}
                      onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                      className="peer w-full px-4 py-3 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 animate-slideInRight"
                      required
                    />
                    <label
                      htmlFor="edit-title"
                      className="absolute left-4 top-3 text-gray-500 dark:text-gray-400 transition-all duration-300 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-xs"
                    >
                      Title
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      id="edit-dueDate"
                      value={selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value })}
                      className="peer w-full px-4 py-3 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 animate-slideInRight"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <label
                      htmlFor="edit-dueDate"
                      className="absolute left-4 top-3 text-gray-500 dark:text-gray-400 transition-all duration-300 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-xs"
                    >
                      Due Date
                    </label>
                  </div>
                  <div className="relative">
                    <select
                      id="edit-priority"
                      value={selectedTask.priority}
                      onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}
                      className="peer w-full px-4 py-3 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 animate-slideInRight appearance-none"
                      style={{ animationDelay: '0.2s' }}
                    >
                      <option value="low" className="text-green-600">Low</option>
                      <option value="medium" className="text-yellow-600">Medium</option>
                      <option value="high" className="text-red-600">High</option>
                    </select>
                    <label
                      htmlFor="edit-priority"
                      className="absolute left-4 top-3 text-gray-500 dark:text-gray-400 transition-all duration-300 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-xs"
                    >
                      Priority
                    </label>
                    <svg className="absolute right-4 top-4 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-3 animate-slideInRight" style={{ animationDelay: '0.3s' }}>
                    <input
                      type="checkbox"
                      id="edit-completed"
                      checked={selectedTask.completed}
                      onChange={(e) => setSelectedTask({ ...selectedTask, completed: e.target.checked })}
                      className="w-5 h-5 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor="edit-completed" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Completed
                    </label>
                  </div>
                  <div className="flex justify-between gap-3 animate-slideInRight" style={{ animationDelay: '0.4s' }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(selectedTask._id)}
                      className="px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-all duration-300"
                    >
                      Delete Task
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-all duration-300"
                      >
                        Update Task
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out forwards;
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out forwards;
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 2s infinite ease-in-out;
        }
        
        /* Custom select arrow styling */
        select::-ms-expand {
          display: none;
        }
        
        select {
          -webkit-appearance: none;
          -moz-appearance: none;
        }
        
        /* Ensure dark mode input fields are readable */
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
      `}</style>
    </>
  );
};

// Use the component with user's email from auth
export default function CalendarPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your calendar...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-dark p-8 rounded-2xl shadow-xl text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            🔒
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to view your calendar and tasks
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <CalendarBox email={session.user.email} />
      </div>
    </div>
  );
}