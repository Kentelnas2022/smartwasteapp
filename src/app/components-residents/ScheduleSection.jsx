"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { motion } from "framer-motion";
import { Clock, Recycle, Activity } from "lucide-react";

export default function ScheduleSection() {
  const [ongoing, setOngoing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [residentPurok, setResidentPurok] = useState(null);

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m));
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;
  };

  const normalizePurok = (p) => p.replace(/^Purok\s*/i, "").trim();

  const fetchResidentPurok = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      let { data: profile } = await supabase
        .from("profiles")
        .select("purok")
        .eq("id", user.id)
        .single();

      if (!profile) {
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

  const fetchSchedules = async (purok) => {
    const today = getToday();
    const now = new Date();
    const normalizedPurok = normalizePurok(purok);

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .ilike("purok", `%${normalizedPurok}%`)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching schedules:", error);
      return;
    }

    if (data) {
      const ongoingSchedules = data.filter((s) => {
        if (s.date !== today) return false;
        const start = new Date(`${s.date}T${s.start_time}`);
        const end = new Date(`${s.date}T${s.end_time}`);
        return now >= start && now <= end;
      });

      const upcomingSchedules = data.filter((s) => {
        const scheduleDate = new Date(`${s.date}T${s.start_time}`);
        const endDate = new Date(`${s.date}T${s.end_time}`);
        if (endDate < now) return false;
        if (s.date === today) {
          const start = new Date(`${s.date}T${s.start_time}`);
          return start > now;
        }
        return scheduleDate > now;
      });

      setOngoing(ongoingSchedules);
      setUpcoming(upcomingSchedules);
    }
  };

  useEffect(() => {
    fetchResidentPurok();
  }, []);

  useEffect(() => {
    if (residentPurok) {
      fetchSchedules(residentPurok);

      const channel = supabase
        .channel("schedule-changes")
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

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8 transition-all border border-gray-100">
      {/* Header */}
      <div className="mb-6 border-b pb-4 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 tracking-wide">
          Waste Collection Schedule
        </h2>
      </div>

      {/* 🔴 ONGOING / PRESENT SCHEDULE */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-red-700" />
          <h3 className="text-lg font-semibold text-gray-900 uppercase tracking-wide">
            Present Schedule
          </h3>
        </div>

        {ongoing.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ongoing.map((sched) => (
              <motion.div
                key={sched.schedule_id}
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-red-900 via-red-700 to-black text-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold bg-white text-red-700 px-3 py-1 rounded-full shadow-sm">
                    ONGOING
                  </span>
                  <Recycle className="w-5 h-5 text-white opacity-90" />
                </div>

                <p className="text-lg font-semibold mb-1">
                  {sched.recyclable_type || sched.waste_type || "General Waste"}
                </p>
                <p className="text-sm text-red-100">
                  {sched.day}, {sched.date}
                </p>
                <div className="flex items-center gap-2 mt-2 text-red-100 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>
                    {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm italic">
            No ongoing schedules today.
          </p>
        )}
      </section>

      {/* Divider */}
      <div className="w-full border-t border-gray-200 my-6"></div>

      {/* ⚪ UPCOMING */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-gray-800" />
          <h3 className="text-lg font-semibold text-gray-900 uppercase tracking-wide">
            Upcoming Schedules
          </h3>
        </div>

        {upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map((sched) => (
              <motion.div
                key={sched.schedule_id}
                whileHover={{ scale: 1.01 }}
                className="flex justify-between items-center bg-gradient-to-r from-white via-gray-50 to-gray-100 border border-gray-200 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-all"
              >
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {sched.day}, {sched.date}
                  </p>
                  <div className="flex items-center gap-2 text-gray-700 text-sm mt-1">
                    <Recycle className="w-4 h-4 text-red-700" />
                    <span>
                      {sched.recyclable_type || sched.waste_type || "General Waste"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 text-sm mt-1">
                    <Clock className="w-4 h-4 text-gray-800" />
                    <span>
                      {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
                    </span>
                  </div>
                </div>
                <span className="text-xs bg-red-700 text-white px-3 py-1 rounded-full font-medium shadow-sm">
                  UPCOMING
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm italic">
            No upcoming schedules found.
          </p>
        )}
      </section>
    </div>
  );
}
