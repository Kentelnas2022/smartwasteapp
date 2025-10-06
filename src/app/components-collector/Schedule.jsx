"use client";
import { useState, useEffect } from "react";

export default function Schedule() {
  const [schedule, setSchedule] = useState([]);

  // 🔗 Load routes from localStorage (official side)
  useEffect(() => {
    const savedRoutes = JSON.parse(localStorage.getItem("routes")) || [];

    const mappedSchedule = savedRoutes.map((r) => ({
      id: r.id,
      date: r.scheduleDate || "Not set",
      start: r.scheduleStart || null,
      end: r.scheduleEnd || null,
      purok: r.purok || "Unknown",
      plan: r.plan || "Not set",
    }));

    setSchedule(mappedSchedule);
  }, []);

  // 📅 Format day of week + date
  const formatDateWithDay = (dateString) => {
    if (!dateString || dateString === "Not set") return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long", // Monday, Tuesday, etc.
      month: "short",
      day: "numeric",
    });
  };

  // 🕒 Format 24-hour time into AM/PM
  const formatTime = (time) => {
    if (!time) return "—";
    const [hour, minute] = time.split(":");
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
  };

  
}