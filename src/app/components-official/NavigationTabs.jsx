"use client";

import {
  LayoutDashboard,
  Calendar,
  Map,
  MessageSquare,
  FileText,
  BookOpen,
} from "lucide-react";

export default function NavigationTabs({ activeTab, onTabChange }) {
  const tabs = [
    { name: "Dashboard", icon: LayoutDashboard, color: "text-blue-500" },
    { name: "Schedule", icon: Calendar, color: "text-green-500" },
    { name: "Routes", icon: Map, color: "text-purple-500" },
    { name: "SMS Alerts", icon: MessageSquare, color: "text-pink-500" },
    { name: "Reports", icon: FileText, color: "text-yellow-500" },
    { name: "Education", icon: BookOpen, color: "text-indigo-500" },
  ];

  const handleTabClick = (name) => {
    onTabChange(name);
    const section = document.getElementById(
      name.toLowerCase().replace(" ", "-")
    );
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="glass-card shadow-xl border-b border-white border-opacity-20 sticky top-0 z-40">
      <div className="px-4 sm:px-6">
        <div className="flex w-full relative">
          {tabs.map(({ name, icon: Icon, color }) => (
            <button
              key={name}
              onClick={() => handleTabClick(name)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 sm:py-3 px-3 sm:px-6 rounded-lg sm:rounded-xl font-medium relative 
              transition-all duration-500 ease-in-out ${
                activeTab === name
                  ? "bg-red-800 text-white shadow-lg"
                  : "text-gray-600 hover:text-gray-800 hover:bg-red-50 hover:bg-opacity-50"
              }`}
            >
              <Icon
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-500 ease-in-out ${
                  activeTab === name ? "text-white scale-110" : `${color} scale-100`
                }`}
              />
              <span className="text-sm sm:text-base">{name}</span>
            </button>
          ))}

          {/* Sliding Active Indicator */}
          <div
            className="absolute bottom-0 h-1 bg-red-600 rounded-t-lg transition-all duration-500 ease-in-out"
            style={{
              width: `${100 / tabs.length}%`,
              left: `${
                (tabs.findIndex((t) => t.name === activeTab) * 100) /
                tabs.length
              }%`,
            }}
          ></div>
        </div>
      </div>
    </nav>
  );
}