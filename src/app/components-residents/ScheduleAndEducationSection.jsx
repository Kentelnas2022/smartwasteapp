"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { motion } from "framer-motion";
import {
  Recycle,
  Leaf,
  Target,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

export default function ScheduleAndEducationSection() {
  const [ongoing, setOngoing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [residentPurok, setResidentPurok] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingEdu, setLoadingEdu] = useState(true);
  const [errorEdu, setErrorEdu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

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

  const fetchEducation = async () => {
    setLoadingEdu(true);
    try {
      const { data, error } = await supabase
        .from("educational_contents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Limit to the latest 4 items
      const limitedData = data.slice(0, 4);

      setItems(limitedData || []);
    } catch (err) {
      console.error("fetch educational contents error:", err);
      setErrorEdu(err.message || String(err));
    } finally {
      setLoadingEdu(false);
    }
  };

  useEffect(() => {
    fetchResidentPurok();
    fetchEducation();
  }, []);

  useEffect(() => {
    if (residentPurok) {
      fetchSchedules(residentPurok);

      const scheduleChannel = supabase
        .channel("schedule-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "schedules" },
          () => fetchSchedules(residentPurok)
        )
        .subscribe();

      const educationChannel = supabase
        .channel("education-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "educational_contents" },
          fetchEducation // Re-fetch the data when educational content changes
        )
        .subscribe();

      return () => {
        supabase.removeChannel(scheduleChannel);
        supabase.removeChannel(educationChannel);
      };
    }
  }, [residentPurok]);

  // Mapping categories to icons
  const getCategoryIcon = (category) => {
    if (!category) return BookOpen;
    switch (category.toLowerCase()) {
      case "waste segregation":
      case "recycling":
      case "plastic waste management":
      case "e-waste management":
        return Recycle;
      case "composting":
      case "water conservation":
      case "sustainable living":
        return Leaf;
      case "waste reduction":
      case "proper disposal":
        return Target;
      case "hazardous waste":
      case "health and safety":
        return AlertTriangle;
      default:
        return BookOpen;
    }
  };

  return (
    <div className="space-y-10 text-black">
      {/* 🗓️ Collection Schedule Container */}
      <div className="">
        <h2 className="text-xl font-semibold text-black mb-5 flex items-center gap-2">
          Collection Schedule
        </h2>

        <div className="space-y-4">
          {ongoing.length > 0 ? (
            ongoing.map((sched) => (
              <div
                key={sched.schedule_id}
                className="flex justify-between items-center bg-white border border-gray-200 p-4 rounded-2xl shadow-sm"
              >
                <div>
                  <h3 className="font-normal text-green-700">
                    {sched.recyclable_type || sched.waste_type || "General Waste"}
                  </h3>
                  <p className="text-sm text-gray-700">
                    {sched.day},{" "}
                    {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
                  </p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                  Ongoing
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-xs">
              No ongoing collections today.
            </p>
          )}

          {upcoming.length > 0 &&
            upcoming.map((sched) => (
              <div
                key={sched.schedule_id}
                className="flex justify-between items-center bg-white border border-gray-200 p-4 rounded-2xl shadow-sm"
              >
                <div>
                  <h3 className="font-normal text-black">
                    {sched.recyclable_type || sched.waste_type || "General Waste"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {sched.day},{" "}
                    {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
                  </p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
                  Upcoming
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* 📘 Learn & Tips Container */}
      <div className="">
        <h2 className="text-xl font-semibold text-black mb-4 flex items-center gap-2">
          Learn & Tips
        </h2>

        {loadingEdu && (
          <p className="text-gray-700 text-sm">Loading educational content...</p>
        )}
        {errorEdu && <p className="text-red-500 text-sm">{errorEdu}</p>}

        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {items.map((item) => {
              const IconComponent = getCategoryIcon(item.category);
              return (
                <motion.div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md cursor-pointer text-center border border-gray-200"
                >
                  <div className="flex justify-center mb-2">
                    <div className="p-3 rounded-full bg-gray-100 text-gray-800 shadow-sm">
                      <IconComponent className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-black mb-1 line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-700 line-clamp-2 leading-snug">
                    {item.description || "No description provided."}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📺 Modal */}
      {selectedItem && (
        <div className="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-lg shadow-lg max-w-sm w-full p-5 relative"
          >
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✖
            </button>
            <h3 className="text-base font-semibold text-black mb-2">
              {selectedItem.title}
            </h3>
            <p className="text-xs text-gray-700 mb-3">
              <span className="font-medium">Category:</span>{" "}
              {selectedItem.category || "General"}
            </p>
            <p className="text-sm text-gray-700 mb-3">
              {selectedItem.description}
            </p>
            {selectedItem.media_url &&
              selectedItem.media_type?.startsWith("video") && (
                <video
                  src={selectedItem.media_url}
                  controls
                  className="rounded-md w-full h-48 object-cover"
                />
              )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
