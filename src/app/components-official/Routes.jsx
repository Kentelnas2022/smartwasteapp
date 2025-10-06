"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { MapPin, Clock, Pencil, Plus, X, Home } from "lucide-react";
import "leaflet/dist/leaflet.css";

// dynamically import react-leaflet parts so window is defined
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

import L from "leaflet";

// fix default marker icons (React + Leaflet quirk)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// custom truck icon
const truckIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/861/861060.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

export default function Routes() {
  const [routes, setRoutes] = useState([]);
  const [vehicles] = useState([
    {
      id: "truck1",
      name: "Garbage Truck – Tambacan",
      lat: 8.2386, // Tambacan
      lng: 124.2433, // Tambacan
      status: "On route",
    },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const [form, setForm] = useState({
    id: null,
    purok: "",
    scheduleDay: "",
    scheduleDate: "",
    scheduleStart: "",
    scheduleEnd: "",
    scheduleTime: "",
    type: "",
    plan: "A",
    lat: 8.2386, // Tambacan default lat
    lng: 124.2433, // Tambacan default lng
  });

  useEffect(() => {
    const savedRoutes = JSON.parse(localStorage.getItem("routes")) || [];
    setRoutes(savedRoutes);
  }, []);

  useEffect(() => {
    localStorage.setItem("routes", JSON.stringify(routes));
  }, [routes]);

  const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "scheduleDate") {
      setForm({ ...form, scheduleDate: value, scheduleDay: getDayName(value) });
    } else if (name === "scheduleStart" || name === "scheduleEnd") {
      const updatedForm = { ...form, [name]: value };
      if (updatedForm.scheduleStart && updatedForm.scheduleEnd) {
        updatedForm.scheduleTime = `${updatedForm.scheduleStart} - ${updatedForm.scheduleEnd}`;
      }
      setForm(updatedForm);
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAddOrEdit = (e) => {
    e.preventDefault();
    if (form.id) {
      setRoutes(routes.map((r) => (r.id === form.id ? form : r)));
    } else {
      setRoutes([...routes, { ...form, id: Date.now() }]);
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({
      id: null,
      purok: "",
      scheduleDay: "",
      scheduleDate: "",
      scheduleStart: "",
      scheduleEnd: "",
      scheduleTime: "",
      type: "",
      plan: "A",
      lat: 8.2386,
      lng: 124.2433,
    });
    setShowModal(false);
  };

  const handleEdit = (route) => {
    setForm(route);
    setShowModal(true);
  };

  return (
    <section className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🚚 Route Management</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
        >
          <Plus size={20} /> Add New Route
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* left: list */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Current Routes</h3>
          <div className="space-y-4">
            {routes.map((route) => (
              <div
                key={route.id}
                onClick={() => setSelectedRoute(route)}
                className={`rounded-xl p-5 shadow-md bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300 border cursor-pointer ${
                  selectedRoute?.id === route.id ? "border-emerald-400" : ""
                }`}
              >
                <h4 className="font-bold text-gray-800 text-lg">
                  {route.purok}{" "}
                  <span className="text-sm text-gray-500">({route.plan})</span>
                </h4>

                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-rose-500" />
                    <span>Purok: {route.purok}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-emerald-500" />
                    <span>
                      {route.scheduleDay}, {route.scheduleTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home size={16} className="text-orange-500" />
                    <span>Type: {route.type}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setViewModal(route)}
                    className="flex-1 bg-indigo-500 text-white py-2 rounded-lg text-sm hover:bg-indigo-600 transition"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(route)}
                    className="flex-1 bg-amber-500 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-amber-600 transition"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* right: map */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Route Map</h3>
          <div className="rounded-xl overflow-hidden shadow-inner">
            <MapContainer
              center={[8.2386, 124.2433]} // Tambacan center
              zoom={13}
              style={{ height: "300px", width: "100%" }}
            >
              <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {routes.map((route) => (
                <Marker key={route.id} position={[route.lat, route.lng]}>
                  <Popup>
                    <strong>{route.purok}</strong>
                    <br />
                    {route.scheduleDay}, {route.scheduleTime}
                    <br />
                    Type: {route.type}
                  </Popup>
                </Marker>
              ))}

              {/* current vehicle markers */}
              {vehicles.map((v) => (
                <Marker key={v.id} position={[v.lat, v.lng]} icon={truckIcon}>
                  <Popup>
                    <strong>{v.name}</strong>
                    <br />
                    Status: {v.status}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {selectedRoute && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50 shadow">
              <h4 className="font-semibold text-gray-800 mb-2">
                📍 Selected Route
              </h4>
              <p>
                <strong>Destination:</strong> {selectedRoute.purok}
              </p>
              <p>
                <strong>Date:</strong> {selectedRoute.scheduleDate}
              </p>
              <p>
                <strong>Time:</strong> {selectedRoute.scheduleTime}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl relative transform scale-95 animate-slideUp">
            <div className="flex justify-between items-center border-b pb-3 mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {form.id ? "✏️ Edit Route" : "🗺️ Add New Route"}
              </h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleAddOrEdit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Purok Name</label>
                <input
                  type="text"
                  name="purok"
                  value={form.purok}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Latitude</label>
                <input
                  type="number"
                  name="lat"
                  value={form.lat}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Longitude</label>
                <input
                  type="number"
                  name="lng"
                  value={form.lng}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Schedule Date</label>
                <input
                  type="date"
                  name="scheduleDate"
                  value={form.scheduleDate}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    name="scheduleStart"
                    value={form.scheduleStart}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    name="scheduleEnd"
                    value={form.scheduleEnd}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Route Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-400"
                  required
                >
                  <option value="">Select type</option>
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Industrial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Route Plan</label>
                <select
                  name="plan"
                  value={form.plan}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-400"
                  required
                >
                  <option value="A">Plan A</option>
                  <option value="B">Plan B</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 transition"
                >
                  {form.id ? "Update Route" : "Add Route"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative transform scale-95 animate-slideUp">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-800">📋 Route Details</h3>
              <button
                onClick={() => setViewModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-gray-700 text-sm">
              <p>
                <strong>Purok:</strong> {viewModal.purok}
              </p>
              <p>
                <strong>Date:</strong> {viewModal.scheduleDate}
              </p>
              <p>
                <strong>Day:</strong> {viewModal.scheduleDay}
              </p>
              <p>
                <strong>Time:</strong> {viewModal.scheduleTime}
              </p>
              <p>
                <strong>Type:</strong> {viewModal.type}
              </p>
              <p>
                <strong>Plan:</strong> {viewModal.plan}
              </p>
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={() => setViewModal(null)}
                className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
