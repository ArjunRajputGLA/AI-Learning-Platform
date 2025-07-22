interface TaskFiltersProps {
  priority: string;
  setPriority: (priority: string) => void;
  dueDate: string;
  setDueDate: (dueDate: string) => void;
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;
}

export default function TaskFilters({
  priority,
  setPriority,
  dueDate,
  setDueDate,
  showCompleted,
  setShowCompleted,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-center py-2">
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="bg-slate-800/50 border border-white/5 rounded-lg px-3 py-1.5 text-sm text-white"
      >
        <option value="">All Priorities</option>
        <option value="high">High Priority</option>
        <option value="medium">Medium Priority</option>
        <option value="low">Low Priority</option>
      </select>

      <select
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="bg-slate-800/50 border border-white/5 rounded-lg px-3 py-1.5 text-sm text-white"
      >
        <option value="">All Dates</option>
        <option value="today">Due Today</option>
        <option value="week">Due This Week</option>
        <option value="overdue">Overdue</option>
      </select>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={(e) => setShowCompleted(e.target.checked)}
          className="rounded bg-slate-800/50 border-white/5"
        />
        Show Completed
      </label>
    </div>
  );
}
