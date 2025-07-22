"use client";

import dynamic from "next/dynamic";

const NotesClient = dynamic(() => import("./NotesClient"), {
  ssr: false, // Disable SSR to avoid server-side rendering issues
});

export default function NotesDynamic() {
  return <NotesClient />;
}