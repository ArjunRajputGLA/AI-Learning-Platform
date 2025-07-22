"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_DATA } from "./data";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { ChevronLeft } from "lucide-react";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";
import { useSession } from "next-auth/react";

export function Sidebar() {
  const pathname = usePathname();
  const { setIsOpen, isOpen, isMobile, toggleSidebar, isCollapsed, toggleCollapse, isHovered, setIsHovered } = useSidebarContext();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { data: session, status } = useSession();
  const [isMounted, setIsMounted] = useState(false);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? [] : [title]));
  };

  useEffect(() => {
    NAV_DATA.some((section) => {
      return section.items.some((item) => {
        return item.items?.some((subItem) => {
          if (subItem.url === pathname) {
            if (!expandedItems.includes(item.title)) {
              toggleExpanded(item.title);
            }
            return true;
          }
        });
      });
    });
  }, [pathname]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (status === "loading" || !isMounted) {
    return (
      <aside
        className={cn(
          "overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-linear dark:border-gray-800 dark:bg-gray-dark",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          isOpen ? (isCollapsed && !isHovered && !isMobile ? "w-16" : "w-[290px]") : "w-0",
        )}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
      >
        <div className="flex h-full flex-col py-10 pl-[25px] pr-[7px]">
          <div className={cn("relative pr-4.5", (isCollapsed && !isHovered) && "py-0")}>
            <Link href={"/"} className={cn("px-0 py-2.5 min-[850px]:py-0", (isCollapsed && !isHovered) && "flex justify-center")}>
              <Logo collapsed={isCollapsed && !isHovered} />
            </Link>
          </div>
          <div className={cn("mt-6 flex-1 pr-3 min-[850px]:mt-10", (isCollapsed && !isHovered) && "flex justify-center items-center")}>
            <p className={cn((isCollapsed && !isHovered) && "hidden")}>Loading...</p>
            {(isCollapsed && !isHovered) && <span className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></span>}
          </div>
        </div>
      </aside>
    );
  }

  const filteredNavData = session
    ? NAV_DATA.map((section) => ({
        ...section,
        items: section.items.filter((item) => item.title !== "Authentication"),
      })).filter((section) => section.items.length > 0)
    : NAV_DATA.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.title === "Authentication" ||
            (item.items && item.items.some((subItem) => subItem.url === "/auth/sign-in"))
        ),
      })).filter((section) => section.items.length > 0);

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-linear dark:border-gray-800 dark:bg-gray-dark",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          isOpen ? (isCollapsed && !isHovered && !isMobile ? "w-16" : "w-[290px]") : "w-0",
        )}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
        inert={!isOpen}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
      >
        <div className="flex h-full flex-col py-10 pl-[25px] pr-[7px]">
          <div className={cn("relative pr-4.5", (isCollapsed && !isHovered) && "py-0")}>
            <Link
              href={"/"}
              onClick={() => isMobile && toggleSidebar()}
              className={cn("px-0 py-2.5 min-[850px]:py-0", (isCollapsed && !isHovered) && "flex justify-center")}
            >
              <Logo collapsed={isCollapsed && !isHovered} />
            </Link>

            {isMobile ? (
              <button
                onClick={toggleSidebar}
                className="absolute left-3/4 right-4.5 top-1/2 -translate-y-1/2 text-right"
              >
                <span className="sr-only">Close Menu</span>
                <ArrowLeftIcon className="ml-auto size-7" />
              </button>
            ) : (
              <button
                onClick={toggleCollapse}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 flex items-center justify-center",
                  (isCollapsed && !isHovered) ? "left-1/2 -translate-x-1/2" : "left-3/4 right-4.5"
                )}
              >
                <span className="sr-only">{isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}</span>
                <ChevronLeft
                  className={cn(
                    "size-7 transition-transform duration-200",
                    isCollapsed && "rotate-180"
                  )}
                />
              </button>
            )}
          </div>

          <div className={cn("custom-scrollbar mt-6 flex-1 overflow-y-auto pr-3 min-[850px]:mt-10", (isCollapsed && !isHovered) && "pr-0")}>
            {filteredNavData.map((section) => (
              <div key={section.label} className="mb-6">
                <h2
                  className={cn(
                    "mb-5 text-sm font-medium text-dark-4 dark:text-dark-6",
                    (isCollapsed && !isHovered) && "hidden"
                  )}
                >
                  {section.label}
                </h2>

                <nav role="navigation" aria-label={section.label}>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item.title}>
                        {item.items?.length ? (
                          <div>
                            <MenuItem
                              isActive={item.items.some(
                                ({ url }) => url === pathname,
                              )}
                              onClick={() => toggleExpanded(item.title)}
                            >
                              <item.icon
                                className="size-6 shrink-0"
                                aria-hidden="true"
                              />
                              <span className={cn((isCollapsed && !isHovered) && "hidden")}>{item.title}</span>
                              {!(isCollapsed && !isHovered) && (
                                <ChevronUp
                                  className={cn(
                                    "ml-auto rotate-180 transition-transform duration-200",
                                    expandedItems.includes(item.title) && "rotate-0",
                                  )}
                                  aria-hidden="true"
                                />
                              )}
                            </MenuItem>

                            {expandedItems.includes(item.title) && !(isCollapsed && !isHovered) && (
                              <ul
                                className="ml-9 mr-0 space-y-1.5 pb-[15px] pr-0 pt-2"
                                role="menu"
                              >
                                {item.items.map((subItem) => (
                                  <li key={subItem.title} role="none">
                                    <MenuItem
                                      as="link"
                                      href={subItem.url}
                                      isActive={pathname === subItem.url}
                                    >
                                      <span>{subItem.title}</span>
                                    </MenuItem>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : (
                          (() => {
                            if (item.component) {
                              const Component = item.component;
                              return <Component />;
                            }

                            const href = "url" in item ? item.url + "" : "/" + item.title.toLowerCase().split(" ").join("-");
                            return (
                              <MenuItem
                                className={cn("flex items-center gap-3 py-3", (isCollapsed && !isHovered) && "justify-center")}
                                as="link"
                                href={href}
                                isActive={pathname === href}
                              >
                                <item.icon className="size-6 shrink-0" aria-hidden="true" />
                                <span className={cn((isCollapsed && !isHovered) && "hidden")}>{item.title}</span>
                              </MenuItem>
                            );
                          })()
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}