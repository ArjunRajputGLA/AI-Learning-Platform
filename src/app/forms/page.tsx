"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import KanbanBoard from "./kanban/KanbanBoard";
import { KanbanBoard as KanbanBoardType } from "./kanban/types";
import { DropResult } from "@hello-pangea/dnd";

export default function KanbanPage() {
  const { data: session } = useSession();
  const [kanbanBoard, setKanbanBoard] = useState<KanbanBoardType | null>(null);

  useEffect(() => {
    console.log("Session Data:", session);
    if (session?.user?.id) {
      fetchKanbanBoard();
    } else {
      console.warn("No user ID found in session. Cannot fetch Kanban board.");
    }
  }, [session]);

  const fetchKanbanBoard = async () => {
    try {
      const url = `/api/kanban?userId=${session?.user?.id}`;
      console.log("Fetching Kanban board from:", url);
      const res = await fetch(url);
      console.log("Fetch Response Status:", res.status, res.statusText);
      if (!res.ok) {
        const errorData = await res.json(); // Parse the error response
        console.error('Failed to fetch Kanban board:', res.status, res.statusText, errorData);
        return;
      }
      const data = await res.json();
      console.log("Fetched Kanban Board Data:", data);
      setKanbanBoard(data);
    } catch (error) {
      console.error('Error fetching Kanban board:', error);
      setKanbanBoard(null);
    }
  };

  const onKanbanDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newKanbanBoard = { ...kanbanBoard! };
    const sourceColumn = newKanbanBoard.columns.find(col => col.id === source.droppableId);
    const destinationColumn = newKanbanBoard.columns.find(col => col.id === destination.droppableId);

    if (sourceColumn && destinationColumn) {
      const [movedTask] = sourceColumn.tasks.splice(source.index, 1);
      movedTask.completed = destination.droppableId === "done";
      destinationColumn.tasks.splice(destination.index, 0, movedTask);
      setKanbanBoard(newKanbanBoard);

      try {
        const taskId = typeof movedTask.id === "string" ? movedTask.id : movedTask.id.$oid;
        await fetch("/api/kanban", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session?.user?.id,
            taskId,
            sourceColumnId: source.droppableId,
            destinationColumnId: destination.droppableId,
            destinationIndex: destination.index,
          }),
        });
      } catch (error) {
        console.error("Error updating Kanban board:", error);
        fetchKanbanBoard();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-6 max-w-7xl mx-auto">
        {kanbanBoard ? (
          <KanbanBoard board={kanbanBoard} onDragEnd={onKanbanDragEnd} />
        ) : (
          <div className="text-center text-gray-400 py-8">Loading Kanban board...</div>
        )}
      </div>
    </div>
  );
}