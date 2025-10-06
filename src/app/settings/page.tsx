"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Bell, User, Lock, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "../../../supabaseClient";
import Swal from "sweetalert2"; // ✅ Import SweetAlert2
import "sweetalert2/dist/sweetalert2.min.css"; // Optional styling

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const router = useRouter();

  // ✅ Load theme preference from localStorage
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // ✅ Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // ✅ Toggle notifications (save in DB)
  const toggleNotifications = async () => {
    setNotificationsEnabled(!notificationsEnabled);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ notifications_enabled: !notificationsEnabled })
        .eq("id", user.id);
    }
  };

  // ✅ Handle password change
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("❌ New passwords do not match");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(`❌ ${error.message}`);
    } else {
      setMessage("✅ Password updated successfully");
      // ✅ Show SweetAlert success popup
      Swal.fire({
        icon: "success",
        title: "Password Updated!",
        text: "Your password has been changed successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setShowPasswordModal(false), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      {/* Header with Back Button */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <ArrowLeft size={22} className="text-gray-700 dark:text-white" />
        </button>
        <h1 className="flex-1 text-center text-2xl font-bold text-[#AD2B49] dark:text-white">
          Settings
        </h1>
        <div className="w-8" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6 space-y-4"
      >
        {/* Edit Profile */}
        <button
          onClick={() => router.push("/profile")}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <User className="w-5 h-5 text-[#AD2B49]" />
          <span className="font-medium">Edit Profile</span>
        </button>

        {/* Notifications */}
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-[#AD2B49]" />
            <span className="font-medium">Notifications</span>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={toggleNotifications}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-[#AD2B49] relative">
              <div className="absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition peer-checked:translate-x-full" />
            </div>
          </label>
        </div>

        {/* Dark Mode */}
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700">
          <div className="flex items-center gap-3">
            {darkMode ? (
              <Moon className="w-5 h-5 text-[#AD2B49]" />
            ) : (
              <Sun className="w-5 h-5 text-[#AD2B49]" />
            )}
            <span className="font-medium">Dark Mode</span>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-[#AD2B49] relative">
              <div className="absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition peer-checked:translate-x-full" />
            </div>
          </label>
        </div>

        {/* Change Password */}
        <button
          onClick={() => setShowPasswordModal(true)}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <Lock className="w-5 h-5 text-[#AD2B49]" />
          <span className="font-medium">Change Password</span>
        </button>
      </motion.div>

      {/* Modal for Change Password */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-80 shadow-lg space-y-4"
            >
              <h2 className="text-lg font-bold text-center text-[#AD2B49] dark:text-white">
                Change Password
              </h2>

              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />

              {message && (
                <p className="text-sm text-center text-red-500">{message}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  className="flex-1 py-2 rounded-lg bg-[#AD2B49] text-white hover:bg-[#8c2039]"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
