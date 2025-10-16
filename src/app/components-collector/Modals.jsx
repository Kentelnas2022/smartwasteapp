"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/supabaseClient";

// ✅ Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ✅ Map click handler for setting 2 markers
function LocationPicker({ routePoints, setRoutePoints }) {
  useMapEvents({
    click(e) {
      if (routePoints.length < 2) {
        setRoutePoints([...routePoints, [e.latlng.lat, e.latlng.lng]]);
      } else {
        setRoutePoints([routePoints[0], [e.latlng.lat, e.latlng.lng]]);
      }
    },
  });
  return null;
}

export function StatusModal({ purok, onClose, onUpdate }) {
  const [status, setStatus] = useState(purok?.status || "not-started");
  const [routePoints, setRoutePoints] = useState(() => {
    try {
      if (!purok) return [];
      if (typeof purok.route_points === "string") {
        return JSON.parse(purok.route_points || "[]");
      }
      if (Array.isArray(purok.route_points)) return purok.route_points;
      if (Array.isArray(purok.planA_points)) return purok.planA_points;
      if (Array.isArray(purok.planB_points)) return purok.planB_points;
      return [];
    } catch {
      return [];
    }
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [plan, setPlan] = useState(purok?.plan || "A");

  if (!purok) return null;

  const options = [
    { value: "not-started", label: "Not Started", color: "red" },
    { value: "ongoing", label: "Ongoing", color: "yellow" },
    { value: "completed", label: "Completed", color: "green" },
  ];

  // ✅ handle update button click (status/plan/routes)
  const handleUpdateClick = async () => {
    setIsUpdating(true);
    try {
      const payload = {
        status,
        plan,
        route_points: routePoints,
      };

      const identifier = purok.schedule_id ?? purok.id;
      console.log("Updating schedule:", identifier, payload);

      const { data, error } = await supabase
        .from("schedules")
        .update(payload)
        .eq("schedule_id", identifier)
        .select();

      if (error) throw error;
      if (!data || data.length === 0)
        throw new Error("No matching schedule found. Check schedule_id.");

      if (typeof onUpdate === "function") {
        const updated = data[0] || { ...purok, ...payload };
        onUpdate(updated);
      }

      Swal.fire({
        title: "Status Updated!",
        text:
          plan === "B"
            ? `${purok.purok} Plan B route saved successfully.`
            : `${purok.purok} Plan A updated successfully.`,
        icon: "success",
        confirmButtonColor: "#7f1d1d",
        background: "#fff",
        color: "#000",
      });

      onClose();
    } catch (error) {
      console.error("Update error:", error);
      Swal.fire({
        title: "Update Failed",
        text: error.message || "There was an issue updating the schedule.",
        icon: "error",
        confirmButtonColor: "#7f1d1d",
        background: "#fff",
        color: "#000",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // ✅ handle plan switch + Supabase update
  const handlePlanSwitch = async (newPlan) => {
    try {
      setPlan(newPlan);

      if (newPlan === "B" && Array.isArray(purok?.planB_points)) {
        setRoutePoints(purok.planB_points);
      } else if (newPlan === "A" && Array.isArray(purok?.planA_points)) {
        setRoutePoints(purok.planA_points);
      } else if (Array.isArray(purok?.route_points)) {
        setRoutePoints(purok.route_points);
      } else {
        setRoutePoints([]);
      }

      const identifier = purok.schedule_id ?? purok.id;
      console.log("Updating plan for schedule:", identifier, "->", newPlan);

      const { data, error } = await supabase
        .from("schedules")
        .update({ plan: newPlan })
        .eq("schedule_id", identifier)
        .select();

      if (error) throw error;
      if (!data || data.length === 0)
        throw new Error(
          `No record updated. Check if schedule_id '${identifier}' exists or if RLS allows update.`
        );

      console.log("Plan successfully changed:", data);

      Swal.fire({
        title: "Plan Changed",
        text: `Switched to Plan ${newPlan} successfully.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Plan change error:", error);
      Swal.fire({
        title: "Plan Change Failed",
        text: error.message || "Unexpected error occurred during plan change.",
        icon: "error",
        confirmButtonColor: "#7f1d1d",
        background: "#fff",
        color: "#000",
      });
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 15 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 bg-red-900">
          <h3 className="text-white text-lg font-semibold tracking-wide">
            Update Status
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-white hover:bg-white/20 rounded-full transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 bg-white overflow-y-auto max-h-[70vh]">
          {/* Purok Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">
              Purok Name
            </p>
            <p className="text-sm sm:text-base font-semibold text-black mt-1">
              {purok.purok}
            </p>
          </div>

          {/* Status Selector */}
          <div>
            <p className="text-sm font-semibold text-black mb-3">
              Select Status
            </p>
            <div className="grid grid-cols-3 gap-3">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                    status === opt.value
                      ? `border-${opt.color}-500 bg-${opt.color}-50 text-${opt.color}-700 ring-1 ring-${opt.color}-200`
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full bg-${opt.color}-500`}
                  ></span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plan Selector */}
          <div>
            <p className="text-sm font-semibold text-black mb-3">
              Select Route Plan
            </p>
            <div className="grid grid-cols-2 gap-3">
              {["A", "B"].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePlanSwitch(p)}
                  className={`flex items-center justify-center py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                    plan === p
                      ? "border-red-600 bg-red-50 text-red-700 ring-1 ring-red-200"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Plan {p}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Choose Plan B for alternate routes during roadworks or detours.
            </p>
          </div>

          {/* Route Map */}
          <div>
            <p className="text-sm font-semibold text-black mb-2">Route Map</p>
            <MapContainer
              center={routePoints[0] || [8.228, 124.245]}
              zoom={13}
              style={{
                height: "200px",
                width: "100%",
                borderRadius: "10px",
              }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationPicker
                routePoints={routePoints}
                setRoutePoints={setRoutePoints}
              />
              {routePoints.map((pos, i) => (
                <Marker key={i} position={pos} />
              ))}

              {Array.isArray(purok?.planA_points) &&
                purok.planA_points.length === 2 && (
                  <Polyline positions={purok.planA_points} color="blue" />
                )}
              {Array.isArray(purok?.planB_points) &&
                purok.planB_points.length === 2 && (
                  <Polyline
                    positions={purok.planB_points}
                    color="orange"
                    dashArray="6,6"
                  />
                )}
            </MapContainer>
            <p className="text-xs text-gray-500 mt-2">
              Click twice to set start and end points.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-5 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black hover:bg-gray-100 transition w-full sm:w-auto font-medium"
          >
            Cancel
          </button>
          <button
            disabled={isUpdating}
            onClick={handleUpdateClick}
            className={`px-5 py-2 bg-red-900 text-white rounded-lg shadow-md transition w-full sm:w-auto font-medium ${
              isUpdating ? "opacity-70 cursor-not-allowed" : "hover:bg-red-800"
            }`}
          >
            {isUpdating ? "Updating..." : "Update"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}