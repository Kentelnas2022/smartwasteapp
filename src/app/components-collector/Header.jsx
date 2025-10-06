"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import { HiOutlineUserCircle } from "react-icons/hi2"; // Modern profile icon
import { FaTruck, FaClock } from "react-icons/fa";

export default function Header() {
  const [currentDate, setCurrentDate] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  // 🕒 Real-time clock (with timezone)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      };
      setCurrentDate(now.toLocaleString("en-US", options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
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
    <header className="bg-red-900 border-b border-red-800 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex flex-col sm:flex-row sm:items-center">
          <h1 className="text-lg sm:text-xl font-semibold text-white">
            Waste Collector Dashboard
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 sm:gap-4">
    
          
          {/* Date */}
          <div className="hidden sm:flex items-center gap-1 text-gray-100 font-mono">
            <FaClock />
            <span className="text-sm">{currentDate}</span>
          </div>
          
          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-center w-9 h-9 bg-white/10 border border-white/20 rounded-full shadow-sm hover:bg-white/20 focus:outline-none transition-all"
            >
              <HiOutlineUserCircle className="text-2xl text-white" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md border border-gray-200 z-20 animate-fadeIn">
                <button
                  onClick={handleLogout}
                  className="block w-full px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 text-left"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fade animation for dropdown */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }

        @media (max-width: 640px) {
          header {
            padding: 0.75rem 1rem;
          }

          h1 {
            font-size: 1.25rem;
          }

          span {
            font-size: 0.85rem;
          }

          .flex-col > div {
            margin-bottom: 0.4rem;
          }
        }
      `}</style>
    </header>
  );
}
