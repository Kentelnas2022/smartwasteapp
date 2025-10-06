"use client";
import { useEffect, useState } from "react";
import { MapPin, Clock, StickyNote } from "lucide-react";

export default function RoutesManagement() {
  const [routes, setRoutes] = useState([]);

  // 🔗 Load routes from localStorage
  useEffect(() => {
    const savedRoutes = JSON.parse(localStorage.getItem("routes")) || [];
    setRoutes(savedRoutes);
  }, []);

  // 🔄 Save routes back to localStorage
  const saveRoutes = (updatedRoutes) => {
    setRoutes(updatedRoutes);
    localStorage.setItem("routes", JSON.stringify(updatedRoutes));
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case "clear":
        return "bg-green-500";
      case "construction":
        return "bg-yellow-500";
      case "flooded":
        return "bg-blue-500";
      case "blocked":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const toggleActive = (id) => {
    const updated = routes.map((r) =>
      r.id === id ? { ...r, isActive: !r.isActive } : { ...r, isActive: false }
    );
    saveRoutes(updated);
  };

  // 🗺️ Google Maps setup
  useEffect(() => {
    if (typeof window !== "undefined" && window.google) {
      const map = new window.google.maps.Map(document.getElementById("map"), {
        center: { lat: 10.3157, lng: 123.8854 }, // Cebu example
        zoom: 12,
      });

      // Draw active route
      const active = routes.find((r) => r.isActive);
      if (active) {
        const pathCoordinates = [
          { lat: 10.3157, lng: 123.8854 },
          { lat: 10.3200, lng: 123.9000 },
          { lat: 10.3300, lng: 123.9100 },
        ];

        new window.google.maps.Polyline({
          path: pathCoordinates,
          geodesic: true,
          strokeColor: "#2563EB", // Indigo-600
          strokeOpacity: 0.95,
          strokeWeight: 4,
          map,
        });
      }
    }
  }, [routes]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-lg font-semibold text-gray-900">Route Management</h2>
        <p className="text-sm text-gray-600">
          Manage collection routes and monitor their conditions
        </p>
      </div>

      {/* Map */}
      <div className="p-4">
        <div
          id="map"
          className="w-full h-96 rounded-xl border border-gray-200 shadow-inner"
        ></div>
      </div>

      {/* Route Cards */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        {routes.length > 0 ? (
          routes.map((route) => (
            <div
              key={route.id}
              className={`relative border rounded-xl p-5 transition-all duration-200 shadow-sm hover:shadow-md ${
                route.isActive
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              {/* Active Indicator */}
              {route.isActive && (
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              )}

              {/* Title */}
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 text-base">
                  {route.name || `Route ${route.id}`}
                </h3>
                <p className="text-xs text-gray-500 capitalize">
                  {route.type || "unspecified"} route
                </p>
              </div>

              {/* Info */}
              <div className="text-sm space-y-2">
                <p className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-500" />
                  <span className="font-medium">Puroks:</span>{" "}
                  {Array.isArray(route.puroks)
                    ? route.puroks.join(", ")
                    : route.purok || "—"}
                </p>

                <p>
                  <span className="font-medium">Plan:</span>{" "}
                  {route.plan || "—"}
                </p>

                <p className="flex items-center gap-2">
                  <span className="font-medium">Condition:</span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${getConditionColor(
                      route.roadCondition
                    )}`}
                  ></span>
                  <span className="capitalize">
                    {route.roadCondition || "unknown"}
                  </span>
                </p>

                <p className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  <span className="font-medium">Duration:</span>{" "}
                  {route.duration || "—"}
                </p>

                {route.notes && (
                  <p className="flex items-start gap-2 text-xs text-gray-600 italic">
                    <StickyNote size={14} className="mt-0.5 text-gray-400" />
                    {route.notes}
                  </p>
                )}
              </div>

              {/* Button */}
              <button
                onClick={() => toggleActive(route.id)}
                className={`mt-4 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  route.isActive
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-green-50 text-green-600 hover:bg-green-100"
                }`}
              >
                {route.isActive ? "Deactivate Route" : "Activate Route"}
              </button>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 col-span-full text-center">
            No routes available. Please add one in the official panel.
          </p>
        )}
      </div>
    </div>
  );
}