"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useRouter } from "next/navigation";

export default function Header() {
  const [time, setTime] = useState("");
  const router = useRouter();

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="relative overflow-hidden shadow-2xl">
      {/* Deep red background */}
      <div className="absolute inset-0 bg-red-800"></div>

      {/* Subtle white dot pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      ></div>

      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black opacity-10"></div>

      {/* Header Content */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left side: Logo + Title */}
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
            <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4zM3 8a1 1 0 000 2v6a2 2 0 002 2h10a2 2 0 002-2V10a1 1 0 100-2H3zm8 6a1 1 0 11-2 0V9a1 1 0 112 0v5z" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                Barangay Tambacan
              </h1>
              <p className="text-red-100 font-medium flex items-center text-sm sm:text-base">
                <span className="status-indicator w-2 h-2 bg-green-400 rounded-full mr-2 flex-shrink-0"></span>
                <span className="truncate">Smart Waste Management System</span>
              </p>
            </div>
          </div>

          {/* Right side: Time + Admin Panel + Logout */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            <div className="px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-white shadow-lg text-xs sm:text-base bg-red-800">
              🕐 {time}
            </div>
            <div className="px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-white shadow-lg text-xs sm:text-base bg-red-800 hover:bg-red-900 transition">
              <span className="hidden sm:inline">Admin Panel</span>
              <span className="sm:hidden">Admin</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-white shadow-lg text-xs sm:text-base bg-red-800 hover:bg-red-900 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}