"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { createContext, useContext, useEffect, useState } from "react";

type SidebarState = "expanded" | "collapsed";

type SidebarContextType = {
  state: SidebarState;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within a SidebarProvider");
  }
  return context;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
  defaultCollapsed = false,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebarCollapsed");
      return stored ? JSON.parse(stored) : defaultCollapsed;
    }
    return defaultCollapsed;
  });
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
      setIsCollapsed(false);
      setIsHovered(false);
    } else {
      setIsOpen(true);
      setIsCollapsed(defaultCollapsed);
    }
  }, [isMobile, defaultCollapsed]);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  function toggleSidebar() {
    setIsOpen((prev) => !prev);
  }

  function toggleCollapse() {
    if (!isMobile) {
      setIsCollapsed((prev) => !prev);
    }
  }

  return (
    <SidebarContext.Provider
      value={{
        state: isCollapsed ? "collapsed" : "expanded",
        isOpen,
        setIsOpen,
        isMobile,
        toggleSidebar,
        isCollapsed,
        toggleCollapse,
        isHovered,
        setIsHovered,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}