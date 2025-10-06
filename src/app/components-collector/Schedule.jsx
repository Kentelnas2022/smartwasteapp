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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm sm:text-base font-semibold text-gray-900">
          Weekly Collection Schedule
        </h2>
      </div>

      {/* Grid */}
      <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedule.length > 0 ? (
          schedule.map((day) => (
            <div
              key={day.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <h3 className="text-sm font-semibold text-gray-900">
                {formatDateWithDay(day.date)}
              </h3>

              <p className="mt-1 text-xs text-gray-600">
                {day.purok} ({day.plan !== "Not set" ? `Plan ${day.plan}` : "No Plan"})
              </p>

              <p className="mt-2 text-xs font-medium text-gray-700">
                {formatTime(day.start)} – {formatTime(day.end)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 col-span-full text-center">
            No schedule available
          </p>
        )}
      </div>
    </div>
  );
}