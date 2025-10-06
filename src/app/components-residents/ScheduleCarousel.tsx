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

export default function ScheduleCarousel() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [residentPurok, setResidentPurok] = useState<string | null>(null);

  // ✅ Format date
  const formatDate = (dateStr: string, day: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} (${day})`;
  };

  // ✅ Format time (24hr → 12hr)
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m), 0, 0);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ✅ Normalize purok name
  const normalizePurok = (p: string) => p.replace(/^Purok\s*/i, "").trim();

  // ✅ Fetch resident purok
  const fetchResidentPurok = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Check in profiles table
      let { data: profile } = await supabase
        .from("profiles")
        .select("purok")
        .eq("id", user.id)
        .single();

      if (!profile) {
        // Fallback to residents table
        const { data: resident } = await supabase
          .from("residents")
          .select("purok")
          .eq("user_id", user.id)
          .single();
        if (resident) profile = resident;
      }

      if (profile?.purok) setResidentPurok(profile.purok);
    }
  };

  // ✅ Fetch schedules for user’s Purok
  const fetchSchedules = async (purok: string) => {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const normalizedPurok = normalizePurok(purok);

    const { data, error } = await supabase
      .from("schedules")
      .select("schedule_id, day, date, start_time, end_time, purok, waste_type")
      .ilike("purok", `%${normalizedPurok}%`)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching schedules:", error);
      return;
    }

    if (data) {
      const typed = data as Schedule[];

      // Filter to show upcoming or today’s schedules only
      const upcoming = typed.filter((s) => {
        if (s.date > today) return true;
        if (s.date === today) {
          const [h, m] = s.start_time.split(":");
          const schedTime = new Date();
          schedTime.setHours(parseInt(h), parseInt(m), 0, 0);
          return schedTime >= now;
        }
        return false;
      });

      // Remove duplicates
      const unique = Array.from(
        new Map(upcoming.map((s) => [`${s.date}-${s.purok}`, s])).values()
      );

      setSchedules(unique);
    }
  };

  // ✅ Initial fetch
  useEffect(() => {
    const init = async () => {
      await fetchResidentPurok();
    };
    init();
  }, []);

  // ✅ Subscribe to realtime updates
  useEffect(() => {
    if (residentPurok) {
      fetchSchedules(residentPurok);

      const channel = supabase
        .channel("schedules-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "schedules" },
          () => fetchSchedules(residentPurok)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [residentPurok]);

  // ✅ Waste Type Badge Color
  const wasteColor = (type?: string) => {
    if (!type) return "bg-gray-200 text-gray-700";
    if (type.includes("Recyclable")) return "bg-green-600 text-white";
    if (type.includes("Toxic")) return "bg-yellow-400 text-white";
    if (type.includes("Non-Recyclable")) return "bg-red-600 text-white";
    return "bg-gray-200 text-gray-700";
  };

  return (
    <div className="overflow-x-auto py-6 px-2 scrollbar-hide">
      <div className="flex gap-6 snap-x snap-mandatory">
        {schedules.length > 0 ? (
          schedules.map((schedule) => (
            <motion.div
              key={schedule.schedule_id}
              className="min-w-[260px] snap-center p-5 rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-lg border border-gray-200 hover:shadow-2xl transition-shadow"
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {schedule.day}
              </h3>

              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Calendar size={16} />
                <p>{formatDate(schedule.date, schedule.day)}</p>
              </div>

              <div className="flex items-center gap-2 text-gray-600 text-sm mt-1">
                <Clock size={16} />
                <p>
                  {formatTime(schedule.start_time)} -{" "}
                  {formatTime(schedule.end_time)}
                </p>
              </div>

              {/* ✅ Waste Type Badge */}
              {schedule.waste_type && (
                <div
                  className={`mt-4 inline-block px-3 py-1 text-xs font-semibold rounded-full ${wasteColor(
                    schedule.waste_type
                  )}`}
                >
                  {schedule.waste_type}
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <p className="text-gray-500 text-center w-full">
            No upcoming schedules for your Purok
          </p>
        )}
      </div>
    </div>
  );
}
