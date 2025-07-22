import * as Icons from "../icons";
import { LogoutButton } from "../LogoutButton";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon, // This matches your export
        items: [
          {
            title: "eCommerce",
            url: "/",
          },
        ],
      },
      {
        title: "Calendar",
        url: "/calendar",
        icon: Icons.Calendar, // This matches your export
        items: [],
      },
      {
        title: "Tasks",
        icon: Icons.Checkbox, // This matches your export
        items: [
          {
            title: "List",
            url: "/forms/to-do",
          },
          {
            title: "Kanban",
            url: "/forms/kanban",
          },
        ],
      },
      {
        title: "Notes",
        url: "/tables",
        icon: Icons.Table, // This matches your export
        items: [
          {
            title: "Shared Notes",
            url: "/tables",
          },
          {
            title: "Tracks & Quizzes",
            url: "/tracks",
          }
        ],
      },
      {
        title: "User Account",
        icon: Icons.User, // This matches your export (changed from Alphabet)
        items: [
          {
            title: "Settings",
            url: "/pages/settings",
          },
        ],
      },
    ],
  },
  {
    label: "OTHERS",
    items: [
      {
        title: "Chatssup",
        url: "/chat",
        icon: Icons.User, // Using User icon since MessageSquare isn't available
        items: [],
      },
      {
        title: "UI Elements",
        icon: Icons.FourCircle, // This matches your export
        items: [
          {
            title: "Alerts",
            url: "/ui-elements/alerts",
          },
          {
            title: "Buttons",
            url: "/ui-elements/buttons",
          },
        ],
      },
      {
        title: "Authentication",
        icon: Icons.Authentication, // This matches your export
        items: [
          {
            title: "Sign In",
            url: "/auth/sign-in",
          },
          {
            title: "Sign Up",
            url: "/auth/sign-up",
          },
        ],
      },
      {
        title: "Log Out",
        icon: Icons.Authentication, // Using the new DoorOpen icon
        component: LogoutButton,
        items: [],
      },
    ],
  },
];