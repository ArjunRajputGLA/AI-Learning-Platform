"use client";

import { useState } from "react";

interface FilterSortModalProps {
  onClose: () => void;
  onApply: (priority: string | null, sort: "dueDate" | "priority" | null) => void;
  currentFilter: string | null;
  currentSort: "dueDate" | "priority" | null;
}

export default function FilterSortModal({ onClose, onApply, currentFilter, currentSort }: FilterSortModalProps) {
  const [filterPriority, setFilterPriority] = useState<string | null>(currentFilter);
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | null>(currentSort);

  const handleApply = () => {
    onApply(filterPriority, sortBy);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2D3748] p-6 rounded-lg w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">Filter & Sort</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Filter by Priority</label>
            <select
              value={filterPriority || ""}
              onChange={(e) => setFilterPriority(e.target.value || null)}
              className="w-full p-2 bg-[#4B5563] text-gray-200 rounded-lg border border-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Sort By</label>
            <select
              value={sortBy || ""}
              onChange={(e) => setSortBy((e.target.value as "dueDate" | "priority") || null)}
              className="w-full p-2 bg-[#4B5563] text-gray-200 rounded-lg border border-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">None</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors shadow-sm"
            >
              Apply
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#4B5563] text-gray-200 rounded-lg hover:bg-[#374151] transition-colors shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}