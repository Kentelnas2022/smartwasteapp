"use client";

import { useState, useEffect } from "react";
import {
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/supabaseClient";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function RoutePicker({ points, setPoints }) {
  useMapEvents({
    click(e) {
      if (points.length < 2) {
        setPoints([...points, [e.latlng.lat, e.latlng.lng]]);
      } else {
        setPoints([[e.latlng.lat, e.latlng.lng]]);
      }
    },
  });
  return null;
}

export default function Schedule() {
  const [day, setDay] = useState("");
  const [date, setDate] = useState("");
  const [purok, setPurok] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [plan, setPlan] = useState("A");
  const [wasteType, setWasteType] = useState("");
  const [status, setStatus] = useState("not-started");
  const [schedules, setSchedules] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) console.error("Error fetching schedules:", error);
    else setSchedules(data || []);
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    setDate(selectedDate);
    if (selectedDate) {
      const d = new Date(selectedDate);
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      setDay(days[d.getDay()]);
    } else setDay("");
  };

  // ✅ Add Schedule + Log Activity
  const handleAddSchedule = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase
      .from("schedules")
      .insert([
        {
          purok,
          plan,
          day,
          date,
          start_time: startTime,
          end_time: endTime,
          waste_type: wasteType,
          status,
          route_points: JSON.stringify(routePoints || []),
        },
      ])
      .select("*");

    if (error) {
      console.error("Error adding schedule:", error);
      alert("Failed to add schedule");
      return;
    }

    if (data && data.length > 0) {
      const newSchedule = data[0];
      const actionMessage = `Added new schedule for Purok ${newSchedule.purok} on ${newSchedule.date}`;
      const { error: activityError } = await supabase.from("activities").insert([
        {
          action: actionMessage,
          type: "create",
          schedule_id: newSchedule.id || newSchedule.schedule_id || null,
        },
      ]);
      if (activityError) console.error("Error logging activity:", activityError);
    }

    setDay("");
    setDate("");
    setPurok("");
    setStartTime("");
    setEndTime("");
    setPlan("A");
    setWasteType("");
    setStatus("not-started");
    setRoutePoints([]);
    setIsModalOpen(false);
    fetchSchedules();
  };

  const formatDate = (dateStr, dayLabel) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} (${dayLabel || ""})`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const d = new Date(`1970-01-01T${timeStr}`);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const statusColors = {
    "not-started": "bg-red-100 text-red-800",
    ongoing: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
  };

  const dropdownColors = {
    all: "bg-gray-100 text-gray-800 border-gray-300",
    "not-started": "bg-red-100 text-red-700 border-red-300",
    ongoing: "bg-yellow-100 text-yellow-700 border-yellow-300",
    completed: "bg-green-100 text-green-700 border-green-300",
  };

  const statusLabel = (raw) => {
    if (!raw) return "Not Started";
    const s = String(raw).toLowerCase();
    if (s.includes("completed")) return "Completed";
    if (s.includes("ongoing")) return "Ongoing";
    if (s.includes("not-start")) return "Not Started";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const filteredSchedules = schedules.filter((sched) => {
    if (statusFilter === "all") return true;
    return (sched.status || "").toLowerCase() === statusFilter;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <CalendarDaysIcon className="w-7 h-7 text-red-600" />
        Manage Garbage Collection Schedule
      </h2>

      {/* Filter Dropdown + Add Button */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="relative w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`appearance-none rounded-lg px-4 py-2 pr-10 shadow-sm focus:outline-none focus:ring-2 transition w-full sm:w-auto ${dropdownColors[statusFilter] || "bg-gray-100 text-gray-800"}`}
          >
            <option value="all">All</option>
            <option value="not-started">Not Started</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.25a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg shadow-sm w-full sm:w-auto"
        >
          + Add Schedule
        </button>
      </div>

      {/* ✅ Responsive Table Wrapper */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full text-sm table-auto">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="py-3 px-4 text-left whitespace-nowrap">Date</th>
                <th className="py-3 px-4 text-left whitespace-nowrap">Purok</th>
                <th className="py-3 px-4 text-left whitespace-nowrap">Time</th>
                <th className="py-3 px-4 text-left whitespace-nowrap">Plan</th>
                <th className="py-3 px-4 text-left whitespace-nowrap">Waste Type</th>
                <th className="py-3 px-4 text-left whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSchedules.length > 0 ? (
                filteredSchedules.map((sched) => {
                  const id =
                    sched.schedule_id ?? sched.id ?? `${sched.date}-${sched.purok}`;
                  const planValue = String(sched.plan || "").trim();
                  const statusValue = String(sched.status || "not-started").trim();
                  const badgeClass =
                    statusColors[statusValue] || "bg-gray-100 text-gray-700";

                  return (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(sched.date, sched.day)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">Purok {sched.purok}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{planValue}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{sched.waste_type}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${badgeClass}`}
                        >
                          {statusLabel(statusValue)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-gray-400 text-base"
                  >
                    No schedules available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-semibold text-red-600">Add New Schedule</h3>
            <form onSubmit={handleAddSchedule} className="space-y-3">
              <input
                type="date"
                value={date}
                onChange={handleDateChange}
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="text"
                value={day}
                readOnly
                className="w-full border p-2 rounded bg-gray-100"
              />
              <select
                value={purok}
                onChange={(e) => setPurok(e.target.value)}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Purok</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Purok {i + 1}
                  </option>
                ))}
              </select>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full sm:w-1/2 border p-2 rounded"
                  required
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full sm:w-1/2 border p-2 rounded"
                  required
                />
              </div>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full border p-2 rounded"
              >
                <option value="A">Plan A</option>
                <option value="B">Plan B</option>
              </select>
              <select
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value)}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Waste Type</option>
                <option value="Recyclable Materials">♻️ Recyclable Materials</option>
                <option value="Toxic Materials">☣️ Toxic Materials</option>
                <option value="Non-Recyclable Materials">🗑️ Non-Recyclable Materials</option>
              </select>
              <div>
                <label className="block mb-1 text-sm">
                  Pick Route (click start and end)
                </label>
                <MapContainer
                  center={[8.228, 124.245]}
                  zoom={13}
                  style={{ height: "250px", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <RoutePicker points={routePoints} setPoints={setRoutePoints} />
                  {routePoints.map((pos, idx) => (
                    <Marker key={idx} position={pos} />
                  ))}
                  {routePoints.length === 2 && (
                    <Polyline positions={routePoints} color="blue" />
                  )}
                </MapContainer>
                <p className="text-xs text-gray-500 mt-2">
                  {routePoints.length === 0
                    ? "Click map to select start point"
                    : routePoints.length === 1
                    ? "Click again to select end point"
                    : "Route selected"}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
