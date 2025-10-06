"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  FileText,
  BookOpen,
} from "lucide-react";

export default function NavigationTabs({ activeTab: initialTab, onTabChange }) {
  // ✅ Removed "Routes"
  const tabs = [
    { name: "Dashboard", icon: LayoutDashboard, color: "text-blue-500" },
    { name: "Schedule", icon: Calendar, color: "text-green-500" },
    { name: "SMS Alerts", icon: MessageSquare, color: "text-pink-500" },
    { name: "Reports", icon: FileText, color: "text-yellow-500" },
    { name: "Education", icon: BookOpen, color: "text-indigo-500" },
  ];

  const [activeTab, setActiveTab] = useState(initialTab || "Dashboard");

  // 🧠 Persist tab in localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem("activeTab");
    if (savedTab) {
      setActiveTab(savedTab);
      onTabChange(savedTab);
    }
  }, []);

  // 🧭 Handle tab switching
  const handleTabClick = (name) => {
    setActiveTab(name);
    localStorage.setItem("activeTab", name);
    onTabChange(name);

    const section = document.getElementById(name.toLowerCase().replace(" ", "-"));
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
      <div className="px-2 sm:px-4">
        <div className="flex flex-wrap justify-between w-full relative">
          {tabs.map(({ name, icon: Icon, color }) => (
            <button
              key={name}
              onClick={() => handleTabClick(name)}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium 
              transition-all duration-300 ease-in-out
              ${
                activeTab === name
                  ? "bg-red-700 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              <Icon
                className={`w-5 h-5 sm:w-5 sm:h-5 transition-transform duration-300 ${
                  activeTab === name ? "text-white scale-110" : `${color} scale-100`
                }`}
              />
              {/* 🪶 Hide text on small screens */}
              <span className="hidden sm:inline text-sm sm:text-base">
                {name}
              </span>
            </button>
          ))}

          {/* 🔴 Sliding Active Indicator */}
          <div
            className="absolute bottom-0 h-1 bg-red-600 rounded-t-lg transition-all duration-500 ease-in-out"
            style={{
              width: `${100 / tabs.length}%`,
              left: `${
                (tabs.findIndex((t) => t.name === activeTab) * 100) / tabs.length
              }%`,
            }}
          ></div>
        </div>
      </div>
    </nav>
  );
}
