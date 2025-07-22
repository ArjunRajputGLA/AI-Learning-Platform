"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PencilIcon, 
  TrashIcon, 
  XMarkIcon, 
  StarIcon, 
  ChatBubbleLeftIcon,
  PaperClipIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import toast, { Toaster } from "react-hot-toast";

interface Note {
  _id: string;
  title: string;
  content: string;
  createdBy: string;
  createdById: string;
  tags: string[];
  attachments: { filename: string; url: string; type: string }[];
  ratings: { userId: string; rating: number; createdAt: string }[];
  averageRating: number;
  comments: { userId: string; comment: string; createdAt: string; createdBy?: string; updatedAt?: string }[];
  createdAt: string;
  updatedAt: string;
  files?: File[];
}

const NotesClient: React.FC = () => {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newNote, setNewNote] = useState({ title: "", content: "", tags: "", files: [] as File[] });
  const [dragActive, setDragActive] = useState(false);
  const [rating, setRating] = useState<{ [key: string]: number }>({});
  const [comment, setComment] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<{ filename: string; url: string; type: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // State to track if an attachment failed to load
  const [attachmentLoadError, setAttachmentLoadError] = useState<boolean>(false);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/tables");
      if (!res.ok) throw new Error(`Failed to fetch notes: ${res.status}`);
      const data = await res.json();
      console.log("Fetched notes:", data);
      setNotes(data);
    } catch (err: any) {
      setError("Error fetching notes: " + err.message);
      toast.error("Failed to fetch notes. Please try again.", { duration: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      if (newNote.files.length + newFiles.length > 5) {
        setError("Maximum 5 attachments allowed.");
        return;
      }
      setNewNote({ ...newNote, files: [...newNote.files, ...newFiles] });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (newNote.files.length + newFiles.length > 5) {
        setError("Maximum 5 attachments allowed.");
        return;
      }
      setNewNote({ ...newNote, files: [...newNote.files, ...newFiles] });
    }
  };

  const removeFile = (index: number) => {
    setNewNote({ ...newNote, files: newNote.files.filter((_, i) => i !== index) });
  };

  const handleUpload = async () => {
    if (!session?.user) {
      setError("You must be logged in to upload notes.");
      return;
    }
  
    if (!newNote.title.trim()) {
      toast.error("Title cannot be empty.", { duration: 3000 });
      return;
    }
    if (!newNote.content.trim()) {
      toast.error("Content cannot be empty.", { duration: 3000 });
      return;
    }
  
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", newNote.title);
    formData.append("content", newNote.content);
    formData.append("tags", newNote.tags);
    newNote.files.forEach((file) => formData.append("files", file));
  
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to upload note");
      }
      await fetchNotes();
      setNewNote({ title: "", content: "", tags: "", files: [] });
      setError(null);
      toast.success("Note created successfully!", { duration: 3000 });
    } catch (err: any) {
      setError(err.message || "Error uploading note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidObjectId = (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  const handleUpdate = async (noteId: string) => {
    if (!selectedNote) return;
    console.log("handleUpdate: noteId =", noteId);
    console.log("handleUpdate: selectedNote =", selectedNote);
    console.log("handleUpdate: notes array =", notes);

    if (!isValidObjectId(noteId)) {
      setError("Invalid note ID format.");
      return;
    }

    const confirmUpdate = window.confirm("Are you sure you want to update this note?");
    if (!confirmUpdate) return;

    const noteToUpdate = notes.find((note) => note._id === noteId);
    if (!noteToUpdate || noteToUpdate.createdById !== session?.user?.id) {
      setError("You are not authorized to edit this note or note not found.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", selectedNote.title);
    formData.append("content", selectedNote.content);
    formData.append("tags", selectedNote.tags.join(","));
    if (selectedNote.files && selectedNote.files.length > 0) {
      selectedNote.files.forEach((file) => formData.append("files", file));
    }

    try {
      const res = await fetch(`/api/tables/${noteId}`, {
        method: "PUT",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to update note: ${res.status}`);
      }
      await fetchNotes();
      setSelectedNote(null);
      setError(null);
      toast.success("Note updated successfully!", { duration: 3000 });
    } catch (err: any) {
      setError(err.message || "Error updating note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (noteId: string) => {
    console.log("handleDelete: noteId =", noteId);
    console.log("handleDelete: notes array =", notes);

    if (!isValidObjectId(noteId)) {
      setError("Invalid note ID format.");
      return;
    }

    const noteToDelete = notes.find((note) => note._id === noteId);
    if (!noteToDelete || noteToDelete.createdById !== session?.user?.id) {
      setError("You are not authorized to delete this note or note not found.");
      return;
    }

    const confirmDelete = window.confirm("Are you sure you want to delete this note?");
    if (!confirmDelete) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tables/${noteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to delete note: ${res.status}`);
      }
      await fetchNotes();
      setSelectedNote(null);
      setError(null);
      toast.success("Note deleted successfully!", { duration: 3000 });
    } catch (err: any) {
      setError(err.message || "Error deleting note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAttachment = async (noteId: string, attachmentIndex: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this attachment?");
    if (!confirmed) return;

    try {
      setIsLoading(true);
      console.log("Looking for note with ID:", noteId);
      console.log("Current notes array:", notes);
      const note = notes.find((n) => n._id === noteId);
      console.log("Found note:", note);

      if (!note) {
        console.error("Note not found in notes array:", noteId);
        toast.error("Note not found");
        return;
      }

      const response = await fetch(`/api/tables/attachments/${noteId}/${attachmentIndex}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete attachment");
      }

      const updatedNote = await response.json();
      setNotes(notes.map((n) => (n._id === updatedNote._id ? updatedNote : n)));
      if (selectedNote?._id === updatedNote._id) {
        setSelectedNote(updatedNote);
      }
      toast.success("Attachment deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting attachment:", error);
      toast.error(error.message || "Failed to delete attachment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteComment = async (noteId: string, commentIndex: number) => {
    if (!selectedNote || selectedNote.comments[commentIndex].userId !== session?.user?.id) {
      setError("You are not authorized to delete this comment.");
      return;
    }

    const confirmDelete = window.confirm("Are you sure you want to delete this comment?");
    if (!confirmDelete) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tables/${noteId}/comment?index=${commentIndex}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to delete comment: ${res.status}`);
      }
      const updatedNote = await res.json();
      setNotes(notes.map((note) => (note._id === noteId ? updatedNote : note)));
      setSelectedNote({ ...updatedNote, files: selectedNote?.files || [] });
      setError(null);
      toast.success("Comment deleted successfully!", { duration: 3000 });
    } catch (err: any) {
      setError(err.message || "Error deleting comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (noteId: string, commentIndex: number) => {
    if (!selectedNote || selectedNote.comments[commentIndex].userId !== session?.user?.id) {
      setError("You are not authorized to edit this comment.");
      return;
    }

    if (!editCommentText.trim()) {
      setError("Comment cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tables/${noteId}/comment?index=${commentIndex}`, {
        method: "PATCH",
        body: JSON.stringify({ comment: editCommentText }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to update comment: ${res.status}`);
      }
      const updatedNote = await res.json();
      setNotes(notes.map((note) => (note._id === noteId ? updatedNote : note)));
      setSelectedNote({ ...updatedNote, files: selectedNote?.files || [] });
      setEditingCommentIndex(null);
      setEditCommentText("");
      setError(null);
      toast.success("Comment updated successfully!", { duration: 3000 });
    } catch (err: any) {
      setError(err.message || "Error updating comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingComment = (index: number, currentComment: string) => {
    setEditingCommentIndex(index);
    setEditCommentText(currentComment);
  };

  const cancelEditingComment = () => {
    setEditingCommentIndex(null);
    setEditCommentText("");
  };

  const handleRate = async (noteId: string, value: number) => {
    if (value < 1 || value > 5) {
      setError("Please select a rating between 1 and 5.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tables/${noteId}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating: value }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to rate note: ${res.status}`);
      }
      const updatedNote = await res.json();
      setNotes(notes.map((note) => (note._id === noteId ? updatedNote : note)));
      setRating({ ...rating, [noteId]: value });
      setError(null);
    } catch (err: any) {
      setError("Error rating note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComment = async (noteId: string) => {
    const newComment = comment[noteId] || "";
    if (!newComment.trim()) {
      setError("Comment cannot be empty.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tables/${noteId}/comment`, {
        method: "POST",
        body: JSON.stringify({ comment: newComment }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to add comment: ${res.status}`);
      }
      const updatedNote = await res.json();
      setNotes(notes.map((note) => (note._id === noteId ? updatedNote : note)));
      setComment({ ...comment, [noteId]: "" });
      setError(null);
    } catch (err: any) {
      setError("Error adding comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setSelectedNote(null);
      setSelectedAttachment(null);
      setAttachmentLoadError(false); // Reset error state when closing
    }
  };

  const handleAttachmentClick = (attachment: { filename: string; url: string; type: string }) => {
    setAttachmentLoadError(false); // Reset error state when opening a new attachment
    setSelectedAttachment(attachment);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (!response.ok) {
        throw new Error(`File not accessible: ${response.statusText}`);
      }
      // If HEAD request succeeds, proceed with download
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("Download error:", err);
      toast.error("Failed to download the file. It may have been deleted or is inaccessible.", { duration: 3000 });
    }
  };

  const renderAttachmentPreview = (attachment: { filename: string; url: string; type: string }) => {
    const type = attachment.type.toLowerCase();
    if (type.startsWith("image/")) {
      return (
        <img
          src={attachment.url}
          alt={attachment.filename}
          className="max-w-full max-h-[60vh] object-contain rounded-lg"
          onError={() => setAttachmentLoadError(true)}
          style={{ display: attachmentLoadError ? "none" : "block" }}
        />
      );
    } else if (type === "application/pdf") {
      return (
        <iframe
          src={attachment.url}
          className="w-full h-[60vh] rounded-lg border border-gray-600"
          title={attachment.filename}
          onError={() => setAttachmentLoadError(true)}
          style={{ display: attachmentLoadError ? "none" : "block" }}
        />
      );
    } else {
      return <p className="text-gray-400 text-center">Preview not available for this file type.</p>;
    }
  };

  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase();
    const uploaderMatch = note.createdBy.toLowerCase().includes(query);
    const subjectMatch = note.tags.some((tag) => tag.toLowerCase().includes(query));
    const titleMatch = note.title.toLowerCase().includes(query);
    return uploaderMatch || subjectMatch || titleMatch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-950 text-gray-100 p-6 md:p-10">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-red-600/90 backdrop-blur-sm rounded-xl shadow-lg border border-red-500/50"
            role="alert"
          >
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {session?.user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 p-8 bg-gray-800/70 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700/30"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-blue-300 tracking-tight">Upload a New Note</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                Title
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="text"
                id="title"
                placeholder="Enter note title"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                className="w-full p-3 bg-gray-700/60 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
                Content
              </label>
              <motion.textarea
                whileFocus={{ scale: 1.01 }}
                id="content"
                placeholder="Write your note content here..."
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                className="w-full p-3 bg-gray-700/60 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 h-40 resize-y"
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
                Tags (Comma-Separated)
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="text"
                id="tags"
                placeholder="e.g., Math, Physics, Coding"
                value={newNote.tags}
                onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
                className="w-full p-3 bg-gray-700/60 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
              />
            </div>
            <motion.div
              animate={dragActive ? { scale: 1.05, borderColor: "rgba(59, 130, 246, 0.5)" } : { scale: 1 }}
              className={`border-2 border-dashed p-8 rounded-xl text-center transition-colors duration-300 ${
                dragActive ? "border-blue-500 bg-blue-500/10" : "border-gray-600 hover:border-gray-500"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <PaperClipIcon className="w-8 h-8 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-400 mb-2">Drag and drop your files here or</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                multiple
                name="file-upload"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-400 font-medium transition-colors duration-200"
              >
                Click to Upload
              </motion.button>
              {newNote.files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-sm text-gray-400"
                >
                  <p className="font-medium mb-1">Selected Files:</p>
                  <ul className="space-y-2">
                    {newNote.files.map((file, index) => (
                      <motion.li
                        key={index}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="flex items-center justify-between p-2 bg-gray-700/40 rounded-lg"
                      >
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-400"
                          aria-label={`Remove ${file.name}`}
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </motion.button>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUpload}
              disabled={isSubmitting}
              className={`w-full px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
                isSubmitting
                  ? "bg-blue-500/50 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 hover:shadow-xl"
              }`}
              aria-label="Upload Note"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Upload Note</span>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-10 p-6 bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-700/30"
      >
        <h2 className="text-lg md:text-xl font-bold mb-4 text-blue-400 tracking-wide">
          Search Notes
        </h2>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <motion.input
            whileFocus={{ scale: 1.01 }}
            type="text"
            placeholder="Search by title, creator, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
            aria-label="Search notes"
          />
        </div>
      </motion.div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <motion.div
              key={idx}
              className="p-6 bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-lg animate-pulse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="h-6 bg-gray-700/50 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-700/50 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-700/50 rounded w-2/3"></div>
            </motion.div>
          ))
        ) : filteredNotes.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full text-center text-gray-500 text-lg font-medium"
          >
            No notes found. Try adjusting your search criteria.
          </motion.p>
        ) : (
          filteredNotes.map((note: Note, index: number) => (
            <motion.div
              key={note._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.03, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.3)" }}
              className="relative p-6 bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700/30 cursor-pointer transition-colors duration-300 group"
              onClick={() => setSelectedNote({ ...note, files: [] })}
            >
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-3 truncate group-hover:text-blue-300 transition-colors duration-200">
                  {note.title}
                </h3>
                <p className="text-sm text-gray-400 mb-2 flex items-center space-x-1">
                  <span className="font-medium text-gray-500">By:</span>
                  <span className="truncate">{note.createdBy}</span>
                </p>
                <p className="text-sm text-gray-400 mb-2 flex items-start space-x-1">
                  <span className="font-medium text-gray-500">Tags:</span>
                  <span className="truncate flex-1">{note.tags.join(", ")}</span>
                </p>
                <p className="text-sm text-gray-400 flex items-center space-x-1">
                  <StarIcon className="w-4 h-4 text-yellow-400" />
                  <span>{note.averageRating.toFixed(1)}/5</span>
                </p>
              </div>

              {session?.user?.id === note.createdById && (
                <div className="absolute top-4 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNote({ ...note, files: [] });
                    }}
                    className="text-green-500 hover:text-green-400"
                    aria-label="Edit note"
                    title="Edit Note"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(note._id);
                    }}
                    className="text-red-500 hover:text-red-400"
                    aria-label="Delete note"
                    title="Delete Note"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </motion.button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700/40"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 id="modal-title" className="text-xl font-semibold text-blue-300 tracking-tight">
                    {session?.user?.id === selectedNote.createdById ? "Edit Note" : "View Note"}
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedNote(null)}
                    className="text-gray-400 hover:text-gray-200"
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </motion.button>
                </div>

                <div className="space-y-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                    <motion.input
                      whileFocus={{ scale: 1.01 }}
                      type="text"
                      value={selectedNote.title}
                      onChange={(e) =>
                        setSelectedNote({ ...selectedNote, title: e.target.value })
                      }
                      disabled={session?.user?.id !== selectedNote.createdById}
                      className="w-full p-3 bg-gray-700/60 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Note title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                    <motion.textarea
                      whileFocus={{ scale: 1.01 }}
                      value={selectedNote.content}
                      onChange={(e) =>
                        setSelectedNote({ ...selectedNote, content: e.target.value })
                      }
                      disabled={session?.user?.id !== selectedNote.createdById}
                      className="w-full p-3 bg-gray-700/60 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 h-40 resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Note content"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tags (Comma-Separated)
                    </label>
                    <motion.input
                      whileFocus={{ scale: 1.01 }}
                      type="text"
                      value={selectedNote.tags.join(", ")}
                      onChange={(e) =>
                        setSelectedNote({
                          ...selectedNote,
                          tags: e.target.value.split(",").map((tag) => tag.trim()),
                        })
                      }
                      disabled={session?.user?.id !== selectedNote.createdById}
                      className="w-full p-3 bg-gray-700/60 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Note tags"
                    />
                  </div>
                  {session?.user?.id === selectedNote.createdById && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Add New Attachments (Max 5 Total)
                      </label>
                      <motion.div
                        animate={dragActive ? { scale: 1.05, borderColor: "rgba(59, 130, 246, 0.5)" } : { scale: 1 }}
                        className={`border-2 border-dashed p-6 rounded-xl text-center transition-colors duration-300 ${
                          dragActive ? "border-blue-500 bg-blue-500/10" : "border-gray-600 hover:border-gray-500"
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(false);
                          if (e.dataTransfer.files) {
                            const newFiles = Array.from(e.dataTransfer.files);
                            if ((selectedNote.attachments?.length || 0) + (selectedNote.files?.length || 0) + newFiles.length > 5) {
                              setError("Maximum 5 attachments allowed.");
                              return;
                            }
                            setSelectedNote({ ...selectedNote, files: [...(selectedNote.files ?? []), ...newFiles] });
                          }
                        }}
                      >
                        <PaperClipIcon className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-400 mb-2">Drag and drop your files here or</p>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={(e) => {
                            if (e.target.files) {
                              const newFiles = Array.from(e.target.files);
                              if ((selectedNote.attachments?.length || 0) + (selectedNote.files?.length || 0) + newFiles.length > 5) {
                                setError("Maximum 5 attachments allowed.");
                                return;
                              }
                              setSelectedNote({ ...selectedNote, files: [...(selectedNote.files ?? []), ...newFiles] });
                            }
                          }}
                          className="hidden"
                          id="file-upload-edit"
                          multiple
                          name="file-upload-edit"
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-blue-500 hover:text-blue-400 font-medium transition-colors duration-200"
                        >
                          Click to Upload
                        </motion.button>
                        {selectedNote.files && selectedNote.files.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-4 text-sm text-gray-400"
                          >
                            <p className="font-medium mb-1">Selected Files:</p>
                            <ul className="space-y-2">
                              {selectedNote.files.map((file, index) => (
                                <motion.li
                                  key={index}
                                  initial={{ x: -10, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  className="flex items-center justify-between p-2 bg-gray-700/40 rounded-lg"
                                >
                                  <span className="truncate max-w-[200px]">{file.name}</span>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() =>
                                      setSelectedNote({
                                        ...selectedNote,
                                        files: selectedNote.files?.filter((_, i) => i !== index) ?? [],
                                      })
                                    }
                                    className="text-red-500 hover:text-red-400"
                                    aria-label={`Remove ${file.name}`}
                                  >
                                    <XMarkIcon className="w-5 h-5" />
                                  </motion.button>
                                </motion.li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </motion.div>
                    </div>
                  )}
                </div>

                {session?.user?.id === selectedNote.createdById && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleUpdate(selectedNote._id)}
                    disabled={isSubmitting}
                    className={`mb-6 px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
                      isSubmitting
                        ? "bg-green-500/50 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 hover:shadow-xl"
                    }`}
                    aria-label="Save changes"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </motion.button>
                )}

                <p className="text-sm text-gray-400 mb-2 flex items-center space-x-1">
                  <span className="font-medium text-gray-500">Uploaded by:</span>
                  <span>{selectedNote.createdBy}</span>
                </p>
                <p className="text-sm text-gray-400 mb-6 flex items-center space-x-1">
                  <StarIcon className="w-4 h-4 text-yellow-400" />
                  <span>{selectedNote.averageRating.toFixed(1)}/5</span>
                </p>
                {selectedNote.attachments && selectedNote.attachments.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-200 mb-3">Attachments:</h4>
                    <div className="space-y-3">
                      {selectedNote.attachments.map((attachment, idx) => (
                        attachment ? (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between p-3 bg-gray-700/40 rounded-lg"
                          >
                            <button
                              onClick={() => handleAttachmentClick(attachment)}
                              className="text-blue-400 hover:text-blue-300 underline transition-colors duration-200 truncate max-w-[70%]"
                            >
                              {attachment.filename}
                            </button>
                            {session?.user?.id === selectedNote.createdById && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteAttachment(selectedNote._id, idx)}
                                className="text-red-500 hover:text-red-400"
                                aria-label={`Delete ${attachment.filename}`}
                                title="Delete Attachment"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </motion.button>
                            )}
                          </motion.div>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}

                {session?.user && (
                  <div className="mb-6">
                    <label className="text-sm font-medium text-gray-300 mr-3">Rate this note:</label>
                    <motion.select
                      whileFocus={{ scale: 1.01 }}
                      value={rating[selectedNote._id] || ""}
                      onChange={(e) => handleRate(selectedNote._id, Number(e.target.value))}
                      className="p-2 bg-gray-700/60 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
                      aria-label="Rate this note"
                    >
                      <option value="" disabled>
                        Select a Rating
                      </option>
                      {[1, 2, 3, 4, 5].map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </motion.select>
                  </div>
                )}

                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-400 mb-3 flex items-center gap-x-2">
                    <ChatBubbleLeftIcon className="w-5 h-4 text-blue-500" />
                    <span>Comments</span>
                  </h4>
                  {selectedNote.comments.length === 0 ? (
                    <p className="text-gray-500 text-sm">No comments yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedNote.comments.map((c, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 text-gray-300 rounded-xl bg-gray-600/30 relative group"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-blue-400">
                              {c.createdBy || "Unknown User"}
                            </span>
                            {session?.user?.id === c.userId && (
                              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => startEditingComment(index, c.comment)}
                                  className="text-yellow-500 hover:text-yellow-400"
                                  aria-label="Edit comment"
                                  title="Edit Comment"
                                >
                                  <PencilIcon className="w-5 h-5" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleDeleteComment(selectedNote._id, index)}
                                  className="text-red-500 hover:text-red-400"
                                  aria-label="Delete comment"
                                  title="Delete Comment"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </motion.button>
                              </div>
                            )}
                          </div>
                          {editingCommentIndex === index ? (
                            <div>
                              <motion.textarea
                                whileFocus={{ scale: 1.01 }}
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                className="w-full p-3 bg-gray-600 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 h-24 resize-y"
                              />
                              <div className="mt-2 flex space-x-2">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleEditComment(selectedNote._id, index)}
                                  disabled={isSubmitting}
                                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                                    isSubmitting
                                      ? "bg-green-500/50 cursor-not-allowed"
                                      : "bg-green-600 hover:bg-green-700"
                                  }`}
                                >
                                  {isSubmitting ? "Saving..." : "Save"}
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={cancelEditingComment}
                                  className="px-4 py-2 rounded-lg font-medium bg-gray-600 hover:bg-gray-500 transition-all duration-300"
                                >
                                  Cancel
                                </motion.button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-gray-300">{c.comment}</p>
                              <span className="text-gray-500 text-xs">
                                - {new Date(c.updatedAt || c.createdAt).toLocaleString()}
                                {c.updatedAt && " (Edited)"}
                              </span>
                            </>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {session?.user && (
                    <div className="mt-4">
                      <motion.textarea
                        whileFocus={{ scale: 1.01 }}
                        placeholder="Add a comment..."
                        value={comment[selectedNote._id] || ""}
                        onChange={(e) => setComment({ ...comment, [selectedNote._id]: e.target.value })}
                        className="w-full p-3 bg-gray-600 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 h-24 resize-y"
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleComment(selectedNote._id)}
                        disabled={isSubmitting}
                        className={`mt-3 w-full px-4 py-2 rounded-lg font-medium shadow-lg transition-all duration-300 flex items-center justify-center gap-x-2 ${
                          isSubmitting
                            ? "bg-blue-400/50 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 hover:shadow-xl"
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            <span>Posting...</span>
                          </>
                        ) : (
                          <span>Post Comment</span>
                        )}
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAttachment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="attachment-modal-title"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700/40"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 id="attachment-modal-title" className="text-xl font-semibold text-blue-300 truncate max-w-[80%]">
                    {selectedAttachment.filename}
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedAttachment(null)}
                    className="text-gray-400 hover:text-gray-200"
                    aria-label="Close attachment preview"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </motion.button>
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6 flex justify-center"
                >
                  {attachmentLoadError ? (
                    <p className="text-red-400 text-center">
                      Failed to load attachment preview. The file may be missing or inaccessible.
                    </p>
                  ) : (
                    renderAttachmentPreview(selectedAttachment)
                  )}
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDownload(selectedAttachment.url, selectedAttachment.filename)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 space-x-2"
                  aria-label={`Download ${selectedAttachment.filename}`}
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  <span>Download</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotesClient;