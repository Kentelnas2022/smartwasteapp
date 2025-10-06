"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Recycle } from "lucide-react";
import { supabase } from "@/supabaseClient";

type Schedule = {
  schedule_id: number;
  day: string;
  date: string;
  start_time: string;
  end_time: string;
  purok: string;
  waste_type?: string;
};

export default function OngoingSchedule() {
  const [ongoing, setOngoing] = useState<Schedule[]>([]);

  // ✅ Local date (avoid UTC offset)
  const getLocalDate = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // ✅ Format time 24h → 12h
  const formatTime = (dateStr: string, timeStr: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const d = new Date(dateStr + "T00:00:00");
    d.setHours(parseInt(h), parseInt(m));
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ✅ Determine if schedule is ongoing right now
  const isOngoing = (s: Schedule) => {
    const now = new Date();
    const start = new Date(`${s.date}T${s.start_time}`);
    const end = new Date(`${s.date}T${s.end_time}`);
    return now >= start && now <= end;
  };

  // ✅ Waste type badge color
  const wasteColor = (type?: string) => {
    if (!type) return "bg-gray-200 text-gray-700";
    if (type.includes("Recyclable")) return "bg-green-600 text-white";
    if (type.includes("Toxic")) return "bg-yellow-500 text-black";
    if (type.includes("Non-Recyclable")) return "bg-red-600 text-white";
    return "bg-gray-200 text-gray-700";
  };

  // ✅ Fetch ongoing schedules
  const fetchOngoing = async () => {
    const today = getLocalDate();
    const { data, error } = await supabase
      .from("schedules")
      .select("schedule_id, day, date, start_time, end_time, purok, waste_type")
      .eq("date", today)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching ongoing schedules:", error);
      return;
    }

    if (data) {
      const active = (data as Schedule[]).filter(isOngoing);
      setOngoing(active);
    }
  };

  // ✅ Fetch + Subscribe to real-time updates
  useEffect(() => {
    fetchOngoing();

    const channel = supabase
      .channel("ongoing-schedule")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        () => fetchOngoing()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✅ Empty State
  if (ongoing.length === 0) {
    return (
      <motion.div
        className="p-6 rounded-2xl shadow-lg border bg-white/90 backdrop-blur-md border-gray-200 text-center max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-lg sm:text-xl font-bold mb-2 text-gray-900">
          Ongoing Schedule
        </h2>
        <p className="text-gray-500 text-sm sm:text-base">
          No ongoing schedules right now
        </p>
      </motion.div>
    );
  }

  // ✅ Display Ongoing Schedules
  return (
    <motion.div
      className="relative p-5 sm:p-6 rounded-2xl shadow-lg border bg-white/90 backdrop-blur-md border-gray-200 transition-all max-w-md mx-auto w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          Ongoing Schedule
        </h2>
        <Recycle className="text-[#AD2B49] w-5 h-5 sm:w-6 sm:h-6" />
      </div>

      <div className="space-y-4">
        {ongoing.map((sched) => (
          <motion.div
            key={sched.schedule_id}
            className="p-4 bg-gradient-to-r from-[#FFF5F7] to-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar size={18} className="text-[#AD2B49]" />
              <p className="text-sm sm:text-base font-medium">
                {sched.day}, {sched.date}
              </p>
            </div>

            <div className="flex items-center gap-2 text-gray-700 mt-2">
              <Clock size={18} className="text-[#AD2B49]" />
              <p className="text-sm sm:text-base font-medium">
                {formatTime(sched.date, sched.start_time)} -{" "}
                {formatTime(sched.date, sched.end_time)}
              </p>
            </div>

            {sched.waste_type && (
              <div
                className={`mt-3 inline-block px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${wasteColor(
                  sched.waste_type
                )}`}
              >
                {sched.waste_type}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
