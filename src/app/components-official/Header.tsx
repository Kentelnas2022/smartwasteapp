"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/supabaseClient";
import { useRouter } from "next/navigation";
import { Menu, LogOut, Settings } from "lucide-react";

export default function Header() {
  const [time, setTime] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();

  // ⏰ Clock
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

  // 🧠 Close dropdown if clicking outside + close on Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      const node = menuRef.current;
      // only proceed if we have a DOM node and event target is a DOM Node
      if (!node) return;
      if (event && event.target && event.target instanceof Node) {
        if (!node.contains(event.target)) {
          setMenuOpen(false);
        }
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    // Guard for SSR safety
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error", err);
    } finally {
      router.push("/login");
    }
  };

  const handleAdminClick = () => {
    setMenuOpen(false);
    // router.push('/admin') // uncomment if you have an admin route
  };

  return (
    <header className="relative overflow-visible shadow-lg w-full z-[100]">
      {/* Background layers */}
      <div className="absolute inset-0 bg-red-800" aria-hidden />
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black opacity-10" aria-hidden />

      {/* Header content */}
      <div className="relative z-20 container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl shadow-md">
            <svg
              className="w-8 h-8 sm:w-9 sm:h-9 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4zM3 8a1 1 0 000 2v6a2 2 0 002 2h10a2 2 0 002-2V10a1 1 0 100-2H3zm8 6a1 1 0 11-2 0V9a1 1 0 112 0v5z" />
            </svg>
          </div>

          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              Barangay Tambacan
            </h1>
            <p className="text-red-100 font-medium flex items-center gap-1 text-xs sm:text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full" /> Smart Waste Management System
            </p>
          </div>
        </div>

        {/* Right: Desktop actions */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-red-700 text-white font-semibold shadow text-sm">
            🕐 {time}
          </div>

          <button
            onClick={handleAdminClick}
            className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-900 text-white font-semibold shadow text-sm flex items-center gap-1 transition"
            aria-label="Open Admin Panel"
          >
            <Settings className="w-4 h-4" /> Admin Panel
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-900 text-white font-semibold shadow text-sm flex items-center gap-1 transition"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Mobile: burger menu */}
        <div className="sm:hidden relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Open menu"
            className="p-2 rounded-md bg-white/20 text-white hover:bg-white/30 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              role="menu"
              aria-label="Header menu"
              className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-[200] animate-fade-in"
              style={{ top: "100%" }}
            >
              <div className="px-4 py-2 text-gray-700 font-semibold border-b text-center">🕐 {time}</div>

              <button
                role="menuitem"
                onClick={() => {
                  handleAdminClick();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Settings className="w-4 h-4 text-gray-500" /> Admin Panel
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  handleLogout();
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4 text-gray-500" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* small inline CSS for the fade animation; you can move this to global CSS */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 180ms ease-out; }
      `}</style>
    </header>
  );
}
