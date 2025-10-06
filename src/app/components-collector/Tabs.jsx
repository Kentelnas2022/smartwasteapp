"use client";
import { useState } from "react";
import { Map, ClipboardList } from "lucide-react";
import CollectionStatus from "./CollectionStatus";

export default function Tabs() {
  const [activeTab, setActiveTab] = useState("collection");

  const tabs = [
    { id: "collection", label: "Collection Status", icon: ClipboardList },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Tab headers */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-4 sm:p-6">
        {activeTab === "collection" && <CollectionStatus />}

      </div>
    </div>
  );
}