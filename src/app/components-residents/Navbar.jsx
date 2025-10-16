"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function Navbar({ onOpenSchedule, onOpenReport,}) {
  const [open, setOpen] = useState(false);
  const [activePage, setActivePage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("/default-avatar.png");
  const router = useRouter();
  const channelRef = useRef(null);

  // ✅ Fetch user + notifications once
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Auth fetch error:", error.message);
        return;
      }

      const currentUser = data?.user;
      if (!currentUser) return;

      setUser(currentUser);
      setUserEmail(currentUser.email || "Unknown User");

      // Fetch avatar
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", currentUser.id)
        .single();

      if (profile?.avatar_url) setUserAvatar(profile.avatar_url);

      // Fetch and subscribe
      await fetchNotifications(currentUser.id);
      subscribeToNotifications(currentUser.id);
    };

    init();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // ✅ Fetch all notifications
  const fetchNotifications = async (uid) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) console.error("Fetch error:", error.message);
    else setNotifications(data || []);
  };

  // ✅ Real-time subscription (INSERT, UPDATE, DELETE)
  const subscribeToNotifications = (uid) => {
    if (channelRef.current) return;

    channelRef.current = supabase
      .channel(`realtime-notifications-${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        async (payload) => {
          const newNotif = payload.new;
          const oldNotif = payload.old;

          switch (payload.eventType) {
            case "INSERT":
              setNotifications((prev) => {
                const exists = prev.some((n) => n.id === newNotif.id);
                if (exists) return prev;
                Swal.fire({
                  icon: "info",
                  title: "New Notification",
                  text: newNotif.message,
                  timer: 2500,
                  showConfirmButton: false,
                });
                return [newNotif, ...prev];
              });
              break;

            case "UPDATE":
              setNotifications((prev) =>
                prev.map((n) => (n.id === newNotif.id ? newNotif : n))
              );
              Swal.fire({
                icon: "success",
                title: "Notification Updated",
                text: newNotif.official_response
                  ? `Response: ${newNotif.official_response}`
                  : `Status changed to ${newNotif.status}`,
                timer: 2500,
                showConfirmButton: false,
              });
              break;

            case "DELETE":
              setNotifications((prev) => prev.filter((n) => n.id !== oldNotif.id));
              break;
          }
        }
      )
      .subscribe();
  };

  // ✅ Mark all notifications as read
  const markAllAsRead = async () => {
    if (!notifications.length) {
      Swal.fire("No new notifications", "You're all caught up!", "info");
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id);

    if (error) {
      console.error(error.message);
      return;
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    Swal.fire("Done!", "All notifications marked as read.", "success");
  };

  // ✅ Clear all notifications (real-time delete)
  const clearAllNotifications = async () => {
    if (!notifications.length) {
      Swal.fire("Nothing to clear", "", "info");
      return;
    }

    const confirm = await Swal.fire({
      title: "Clear all notifications?",
      text: "This will permanently delete all your notifications.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete all",
      cancelButtonText: "Cancel",
    });

    if (!confirm.isConfirmed) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete error:", error.message);
      Swal.fire("Error", "Failed to delete notifications.", "error");
      return;
    }

    setNotifications([]);
    Swal.fire("Cleared!", "All notifications deleted permanently.", "success");
  };

  // ✅ Show notification modal
  const showNotifications = () => {
    if (!notifications.length) {
      Swal.fire("No Notifications", "You're all caught up!", "info");
      return;
    }

    const html = notifications
      .map((n) => {
        const date = new Date(n.updated_at || n.created_at).toLocaleString();
        return `
          <div style="padding:8px 0;border-bottom:1px solid #ddd;text-align:left;">
            <p><strong>${n.message}</strong></p>
            <p>Status: <b>${n.status}</b></p>
            ${n.official_response ? `<p>Response: ${n.official_response}</p>` : ""}
            <small>${date}</small>
          </div>
        `;
      })
      .join("");

    Swal.fire({
      title: "Notifications",
      html,
      width: 400,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Mark All as Read",
      denyButtonText: "Clear All",
      cancelButtonText: "Close",
    }).then(async (res) => {
      if (res.isConfirmed) await markAllAsRead();
      else if (res.isDenied) await clearAllNotifications();
    });
  };

  // ✅ Real-time unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ✅ Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("activePage");
    setOpen(false);
    router.push("/login");
  };

  const shortenEmail = (email) =>
    email.length > 20 ? email.slice(0, 17) + "..." : email;

  const menuItems = [
    { key: "schedule", label: "Dashboard", onClick: onOpenSchedule },
    { key: "report", label: "Report Issue", onClick: onOpenReport },
  ];

  return (
    <>
      {/* 🔻 NAVBAR */}
      <nav className="bg-[#8B0000] text-white p-4 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold">Residents Dashboard</h1>

          <div className="flex items-center gap-3 relative">
            {/* 🔔 Notifications */}
            <button
              onClick={showNotifications}
              className="relative p-2 rounded-full hover:bg-[#a30000]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* 🍔 Sidebar Menu Button */}
            <button onClick={() => setOpen(true)} className="p-2 rounded-full hover:bg-[#a30000]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* 🔻 SIDEBAR MENU */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        <div
          className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-[#8B0000]">Menu</h2>
            <button onClick={() => setOpen(false)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* PROFILE */}
          <div className="flex flex-col items-center py-6 border-b">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#8B0000] mb-3">
              <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <p className="text-base font-semibold">{shortenEmail(userEmail)}</p>
            <a href="/profile" className="text-sm text-[#8B0000] mt-1 hover:underline">
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
            <div className="border-t p-4">
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
