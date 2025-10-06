"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";

export default function Header() {
  const [currentDate, setCurrentDate] = useState("");
  const router = useRouter();

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      setCurrentDate(now.toLocaleDateString("en-US", options));
    };
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error during logout:", error.message);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4">
          {/* Left side */}
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              Waste Collection
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">Barangay Dashboard</p>
          </div>

          {/* Right side */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-3 sm:mt-0">
            {/* Collector status */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-600">
                Waste Collector
              </span>
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            </div>

            {/* Date + pulse indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-600">{currentDate}</span>
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-white bg-gradient-to-r from-indigo-600 to-purple-600 py-2 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all ease-in-out duration-300 shadow-lg focus:outline-none"
            >
              <span className="text-sm sm:text-base">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}