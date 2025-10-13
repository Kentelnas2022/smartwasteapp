"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function Navbar({ onOpenSchedule, onOpenReport, onOpenEducation }) {
  const [open, setOpen] = useState(false);
  const [activePage, setActivePage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("/default-avatar.png");
  const sidebarRef = useRef();
  const router = useRouter();

  // ✅ Fetch logged-in user info
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) return console.error("Error fetching user:", error.message);
      const currentUser = data?.user;
      setUser(currentUser);
      if (currentUser) {
        setUserEmail(currentUser.email || "Unknown User");

        const { data: profileData } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", currentUser.id)
          .single();

        if (profileData?.avatar_url) setUserAvatar(profileData.avatar_url);
      }
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ✅ Fetch notifications from the notifications table
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, message, status, created_at, read, user_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching notifications:", error.message);
      else setNotifications(data || []);
    };

    fetchNotifications();

    // 🔥 Real-time listener for notifications
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload) => {
          const notif = payload.new;
          if (notif.user_id !== user.id) return;

          // 🆕 New notification
          if (payload.eventType === "INSERT") {
            Swal.fire({
              icon: "info",
              title: "New Notification",
              text: notif.message,
              timer: 2000,
              showConfirmButton: false,
            });
            setNotifications((prev) => [notif, ...prev]);
          }

          // 🔄 Updated notification (status changed)
          if (payload.eventType === "UPDATE") {
            Swal.fire({
              icon: "success",
              title: "Notification Updated",
              text: notif.message,
              timer: 2000,
              showConfirmButton: false,
            });

            setNotifications((prev) =>
              prev.map((n) => (n.id === notif.id ? { ...n, ...notif } : n))
            );
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  // ✅ Mark all as read
  const markAllAsRead = async () => {
    if (notifications.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No New Notifications",
        text: "You're all caught up!",
        confirmButtonColor: "#8B0000",
      });
      return;
    }

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    Swal.fire({
      icon: "success",
      title: "All Notifications Read",
      showConfirmButton: false,
      timer: 1200,
    });
  };

  // ✅ Clear all notifications
  const clearAllNotifications = async () => {
    if (notifications.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No Notifications",
        text: "Nothing to clear.",
        confirmButtonColor: "#8B0000",
      });
      return;
    }

    const confirm = await Swal.fire({
      icon: "warning",
      title: "Clear All Notifications?",
      text: "This will remove all notifications from view.",
      showCancelButton: true,
      confirmButtonColor: "#8B0000",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, clear all",
    });

    if (confirm.isConfirmed) {
      await supabase.from("notifications").delete().eq("user_id", user.id);
      setNotifications([]);
      Swal.fire({
        icon: "success",
        title: "All Cleared!",
        showConfirmButton: false,
        timer: 1200,
      });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ✅ Show notification popup
  const showNotifications = () => {
    if (notifications.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No Notifications",
        text: "You don't have any notifications yet.",
        confirmButtonColor: "#8B0000",
      });
      return;
    }

    const grouped = notifications.reduce((acc, notif) => {
      const key = notif.status || "Others";
      if (!acc[key]) acc[key] = [];
      acc[key].push(notif);
      return acc;
    }, {});

    const html = Object.entries(grouped)
      .map(
        ([status, items]) => `
        <div style="margin-bottom:16px;">
          <h3 style="color:#8B0000;margin-bottom:6px;text-align:left;font-weight:600;">
            ${status}
          </h3>
          ${items
            .map(
              (n) => `
            <div style="padding:6px 0;border-bottom:1px solid #eee;text-align:left;">
              <p style="font-size:14px;margin:0;">${n.message}</p>
              <small style="color:gray;">${new Date(
                n.created_at
              ).toLocaleString()}</small>
            </div>
          `
            )
            .join("")}
        </div>
      `
      )
      .join("");

    Swal.fire({
      title: "Your Notifications",
      html: html || "<p>No notifications yet.</p>",
      width: 420,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Mark All as Read",
      denyButtonText: "Clear All",
      cancelButtonText: "Close",
      confirmButtonColor: "#8B0000",
      denyButtonColor: "#a30000",
    }).then(async (res) => {
      if (res.isConfirmed) await markAllAsRead();
      else if (res.isDenied) await clearAllNotifications();
    });
  };

  // ✅ Logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return alert("Failed to logout. Please try again.");
    localStorage.removeItem("activePage");
    setOpen(false);
    router.push("/login");
  };

  const shortenEmail = (email) =>
    email.length > 20 ? email.slice(0, 17) + "..." : email;

  const menuItems = [
    { key: "schedule", label: "Collection Schedule", onClick: onOpenSchedule },
    { key: "report", label: "Report Issue", onClick: onOpenReport },
    { key: "education", label: "Education", onClick: onOpenEducation },
  ];

  return (
    <>
      {/* ✅ NAVBAR */}
      <nav className="bg-[#8B0000] text-white p-4 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold">Residents Dashboard</h1>

          <div className="flex items-center gap-3 relative">
            {/* 🔔 Notifications */}
            <button
              onClick={showNotifications}
              className="relative p-2 rounded-full hover:bg-[#a30000] transition-all"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* 🍔 Menu Button */}
            <button
              onClick={() => setOpen(true)}
              className="p-2 rounded-full hover:bg-[#a30000]"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ✅ SIDEBAR MENU */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        <div
          ref={sidebarRef}
          className={`fixed top-0 right-0 h-full w-72 sm:w-64 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-[#8B0000]">Menu</h2>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 transition-all"
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* PROFILE SECTION */}
          <div className="flex flex-col items-center py-6 px-4 border-b border-gray-200">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#8B0000] mb-3 shadow-md">
              <img
                src={userAvatar}
                alt="User Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-base font-semibold">{shortenEmail(userEmail)}</p>
            <a
              href="/profile"
              className="text-sm text-[#8B0000] mt-1 hover:underline"
            >
              View Profile
            </a>
          </div>

          {/* MENU ITEMS */}
          <div className="flex-1 flex flex-col justify-between">
            <div className="py-3">
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    item.onClick?.();
                    setActivePage(item.key);
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-6 py-3 font-medium ${
                    activePage === item.key
                      ? "bg-[#8B0000] text-white"
                      : "text-black hover:bg-[#8B0000]/10"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* LOGOUT */}
            <div className="border-t border-gray-200 p-4">
              <button
                onClick={handleLogout}
                className="w-full bg-[#8B0000] text-white py-2 rounded-lg font-medium hover:bg-[#a30000]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
