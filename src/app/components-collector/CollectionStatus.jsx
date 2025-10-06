// File: CollectionStatus.jsx
"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/supabaseClient";
import { StatusModal } from "./Modals";
import StatsOverview from "./StatsOverview";
import { motion, AnimatePresence } from "framer-motion";
import { Eye } from "lucide-react";

// ✅ Dynamically import react-leaflet components (no SSR)
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false }
);

import "leaflet/dist/leaflet.css";

// ✅ Fix Leaflet marker icons (client-only)
let L;
if (typeof window !== "undefined") {
  L = require("leaflet");
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// ✅ Parse route coordinates safely
const parseCoordinates = (coordData) => {
  if (!coordData) return [];
  if (Array.isArray(coordData)) return coordData;
  if (typeof coordData === "string") {
    let cleaned = coordData.replace(/'/g, '"').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    try {
      const doubleParsed = JSON.parse(JSON.parse(cleaned));
      if (Array.isArray(doubleParsed)) return doubleParsed;
    } catch (err) {
      console.error("Invalid coordinates JSON:", coordData, err);
    }
  }
  return [];
};

// ✅ Helper: log activities to Supabase (with Philippine time)
const logActivity = async (schedule_id, action, type) => {
  const philippineTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Manila",
  });

  const { error } = await supabase.from("activities").insert([
    {
      schedule_id,
      action,
      type,
      created_at: philippineTime,
    },
  ]);

  if (error) console.error("Error logging activity:", error.message);
  else console.log("Activity logged successfully:", action);
};

export default function CollectionStatus() {
  const [schedules, setSchedules] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mapSelected, setMapSelected] = useState(null);

  // 🔗 Fetch schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .order("date", { ascending: true });

      if (error) console.error("Error fetching schedules:", error);
      else {
        const mapped = data.map((r, index) => ({
          id: r.schedule_id,
          purok: r.purok || `Purok ${index + 1}`,
          routeType: r.type || "Unknown",
          routePlan: r.plan || "Not set",
          scheduleDay: r.day || "—",
          scheduleDate: r.date || "—",
          scheduleStart: r.start_time || null,
          scheduleEnd: r.end_time || null,
          status: (r.status || "not-started").toLowerCase(),
          wasteType: r.waste_type || "General",
          coordinates: r.route_points || null,
        }));
        setSchedules(mapped);
      }
    };

    fetchSchedules();

    // 🔄 Realtime updates
    const channel = supabase
      .channel("schedules-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setSchedules((prev) =>
              prev.map((s) =>
                s.id === payload.new.schedule_id
                  ? { ...s, status: payload.new.status.toLowerCase() }
                  : s
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✅ Status color theme
  const getStatusClasses = (status) => {
    if (status === "not-started")
      return "bg-gradient-to-r from-red-100 to-red-200 text-red-800 shadow-inner";
    if (status === "ongoing")
      return "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 shadow-inner";
    if (status === "completed")
      return "bg-gradient-to-r from-green-100 to-green-200 text-green-800 shadow-inner";
    return "bg-gray-100 text-gray-700";
  };

  // ✅ Update status and record activity
  const handleUpdate = async (updated) => {
    const normalized = updated.status.toLowerCase();

    const updatedSchedules = schedules.map((p) =>
      p.id === updated.id ? { ...p, ...updated, status: normalized } : p
    );
    setSchedules(updatedSchedules);
    setSelected(null);

    const { error } = await supabase
      .from("schedules")
      .update({ status: normalized })
      .eq("schedule_id", updated.id);

    if (error) {
      console.error("Error updating schedule:", error);
      return;
    }

    // ✅ Determine action text based on new status
    let actionText = "Updated schedule status";
    let type = "update";

    if (normalized === "completed") {
      actionText = `Marked ${updated.purok} collection as completed`;
      type = "complete";
    } else if (normalized === "ongoing") {
      actionText = `Started collection for ${updated.purok}`;
      type = "update";
    } else if (normalized === "not-started") {
      actionText = `Reset ${updated.purok} collection to not started`;
      type = "reset";
    }

    // ✅ Log to Supabase activities table
    await logActivity(updated.id, actionText, type);
  };

  // Helpers
  const formatTime = (time) => {
    if (!time) return "—";
    const [hour, minute] = time.split(":");
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
  };

  const formatDateWithDay = (dateString, day) => {
    if (!dateString || dateString === "—") return "—";
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `${day}, ${formatted}`;
  };

  const uniqueSchedules = useMemo(() => {
    const map = new Map();
    schedules.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [schedules]);

  const sortedSchedules = [...uniqueSchedules].sort((a, b) => {
    const numA = parseInt(a.purok.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.purok.replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* ✅ Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 to-purple-50/40 rounded-2xl -z-10"></div>

      {/* Stats Overview */}
      <StatsOverview puroks={sortedSchedules} />

      {/* ✅ Responsive container for table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm mt-4">
        <table className="w-full min-w-[650px] border-collapse text-xs sm:text-sm md:text-base">
          <thead>
            <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 text-[11px] sm:text-sm border-b border-gray-200">
              <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700">Purok</th>
              <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700">Route Type</th>
              <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700">Route Plan</th>
              <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700">Schedule</th>
              <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700">Waste Type</th>
              <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700">Status</th>
              <th className="py-3 px-2 sm:px-4 font-semibold text-gray-700 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            <AnimatePresence>
              {sortedSchedules.map((p) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition"
                >
                  <td className="py-3 px-2 sm:px-4 font-medium text-gray-800 whitespace-nowrap">
                    {p.purok}
                  </td>

                  <td className="py-3 px-2 sm:px-4 text-gray-600">
                    <button
                      onClick={() => setMapSelected(p)}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Eye size={16} />
                      <span className="truncate">{p.routeType}</span>
                    </button>
                  </td>

                  <td className="py-3 px-2 sm:px-4 text-gray-600 truncate">
                    {p.routePlan}
                  </td>

                  <td className="py-3 px-2 sm:px-4 text-gray-700 whitespace-nowrap">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-medium text-gray-800">
                        {formatDateWithDay(p.scheduleDate, p.scheduleDay)}
                      </span>
                      <span className="text-gray-500 text-xs sm:text-sm">
                        {formatTime(p.scheduleStart)} – {formatTime(p.scheduleEnd)}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-2 sm:px-4 text-gray-600">{p.wasteType}</td>

                  <td className="py-3 px-2 sm:px-4">
                    <motion.span
                      layout
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium capitalize ${getStatusClasses(
                        p.status
                      )}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {p.status.replace("-", " ")}
                    </motion.span>
                  </td>

                  <td className="py-3 px-2 sm:px-4 text-right">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelected(p)}
                      className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-red-900 text-white rounded-lg shadow hover:from-indigo-700 hover:to-purple-700 transition-all"
                    >
                      Update
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {/* ✅ Status Modal */}
        {selected && (
          <StatusModal
            key={selected?.id}
            purok={selected}
            onClose={() => setSelected(null)}
            onUpdate={handleUpdate}
          />
        )}

        {/* ✅ Map Modal */}
        {mapSelected && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg md:max-w-2xl p-4 relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                onClick={() => setMapSelected(null)}
              >
                ✖
              </button>
              <h2 className="text-lg font-semibold mb-3">
                Route for {mapSelected.purok}
              </h2>

              <div className="h-80 sm:h-96 w-full rounded-lg overflow-hidden">
                <MapContainer
                  center={
                    parseCoordinates(mapSelected.coordinates)[0] || [
                      10.3157,
                      123.8854,
                    ]
                  }
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />

                  {parseCoordinates(mapSelected.coordinates).length > 0 && (
                    <>
                      {parseCoordinates(mapSelected.coordinates).map((pos, idx) => (
                        <Marker key={idx} position={pos}>
                          <Popup>
                            {idx === 0
                              ? "Start Point"
                              : idx ===
                                parseCoordinates(mapSelected.coordinates).length - 1
                              ? "End Point"
                              : `Stop ${idx}`}
                          </Popup>
                        </Marker>
                      ))}
                      <Polyline
                        positions={parseCoordinates(mapSelected.coordinates)}
                        color="blue"
                      />
                    </>
                  )}
                </MapContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
