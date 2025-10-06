"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, LogOut, Settings, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "../../../supabaseClient";

interface HeaderProps {
  name?: string;
  email?: string;
  avatarUrl?: string;
}

interface Notification {
  id: string;
  message: string;
  created_at: string;
  read: boolean;
}

export default function Header(props: HeaderProps) {
  const [userName, setUserName] = useState(props.name || "");
  const [userEmail, setUserEmail] = useState(props.email || "");
  const [userAvatar, setUserAvatar] = useState(props.avatarUrl || "/default-avatar.png");

  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, email, avatar_url")
        .eq("id", user.id)
        .single();

      setUserName(profileData?.name || user.user_metadata?.full_name || user.email || "Resident");
      setUserEmail(profileData?.email || user.email || "");
      setUserAvatar(profileData?.avatar_url || user.user_metadata?.avatar_url || "/default-avatar.png");

      const { data: notifs, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error) setNotifications(notifs || []);

      channel = supabase
        .channel("notifications-channel")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif: Notification = {
              id: payload.new.id,
              message: payload.new.message,
              created_at: payload.new.created_at,
              read: payload.new.read,
            };
            setNotifications((prev) => [newNotif, ...prev]);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? { ...n, read: payload.new.read } : n))
            );
          }
        )
        .subscribe();
    };

    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const markAllAsRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = (userName || "Resident")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <motion.header
      className="flex items-center justify-between px-6 py-6 bg-[#AD2B49] text-white shadow-md relative w-full"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-lg sm:text-2xl font-bold tracking-wide border-r-4 pr-2">
        Welcome, {userName || "Resident"}!
      </h1>

      <div className="flex items-center gap-6 relative">
        {/* 🔔 Notifications */}
        <div ref={notifRef} className="relative">
          <button
            className="relative hover:scale-110 transition"
            onClick={() => {
              const newState = !notifOpen;
              setNotifOpen(newState);
              if (newState) markAllAsRead();
            }}
          >
            <Bell className="w-7 h-7 cursor-pointer" />
            {notifications.some((n) => !n.read) && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs bg-yellow-400 text-black rounded-full font-semibold">
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="absolute right-0 mt-3 w-80 sm:w-96 bg-white text-gray-800 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50 sticky top-0 z-10">
                  <h3 className="text-base font-semibold text-gray-800">Notifications</h3>
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-[#AD2B49] hover:underline"
                  >
                    Mark all read
                  </button>
                </div>

                {/* Notification List */}
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm">
                    <Bell className="w-7 h-7 mb-2 text-gray-300" />
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-start gap-3 px-5 py-4 border-b last:border-none hover:bg-gray-50 transition ${
                        notif.read ? "bg-white" : "bg-[#FFF5F7]"
                      }`}
                    >
                      {/* Status icon */}
                      <div className="flex-shrink-0">
                        {notif.read ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="#AD2B49"
                            className="w-5 h-5 opacity-60 mt-1"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-[#AD2B49] mt-1"></div>
                        )}
                      </div>

                      {/* Message */}
                      <div className="flex-1">
                        <p
                          className={`text-sm leading-snug ${
                            notif.read ? "text-gray-700" : "text-gray-900 font-medium"
                          }`}
                        >
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 👤 Profile */}
        <div className="relative" ref={dropdownRef}>
          <div
            className="w-11 h-11 rounded-full overflow-hidden border-2 border-white cursor-pointer hover:scale-105 transition flex items-center justify-center bg-gray-200 text-[#AD2B49] font-bold"
            onClick={() => setOpen(!open)}
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-60 bg-white text-gray-800 rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
              >
                <div className="flex items-center gap-3 px-4 py-4 bg-gray-50 border-b">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-[#AD2B49] font-bold">
                    {userAvatar ? (
                      <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-500">{userEmail}</p>
                  </div>
                </div>
                <a
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-3 hover:bg-gray-100 hover:text-[#AD2B49]"
                >
                  <User className="w-5 h-5" />
                  View Profile
                </a>
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-3 hover:bg-gray-100 hover:text-[#AD2B49]"
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </a>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 hover:text-[#AD2B49] text-left"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
