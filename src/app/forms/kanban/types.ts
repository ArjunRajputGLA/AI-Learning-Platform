export interface ErrorHandler {
  (error: any, fallbackMessage: string): void;
}

export interface SuccessHandler {
  (message: string): void;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface TaskValidation {
  validate: (data: any) => ValidationError[];
}

export interface KanbanTask {
  id: { $oid: string } | string;
  title: string;
  description: string;
  priority: string;
  dueDate: { $date: string } | null;
  completed: boolean;
  createdAt: { $date: string };
}

export interface Column {
  id: string;
  title: string;
  tasks: KanbanTask[];
}

export interface KanbanBoard {
  _id: { $oid: string };
  title: string;
  userId: { $oid: string };
  relatedTrack: { $oid: string } | null;
  columns: Column[];
  createdAt: { $date: string };
  updatedAt: { $date: string };
}