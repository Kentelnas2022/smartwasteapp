"use client";
import { useState } from "react";
import { CheckCircle, XCircle, Clock, MapPin, User } from "lucide-react";

export default function ViewStatus() {
  const [statusData] = useState([
    {
      brgy: "Purok. 1",
      status: "Completed",
      time: "8:30 AM",
      route: {
        name: "Route A",
        type: "Residential",
        schedule: "Mon, Wed, Fri (06:00 - 10:00)",
        coverage: "Purok 1-3",
        collector: "Pedro Santos",
      },
    },
    {
      brgy: "Purok. 2",
      status: "Pending",
      time: "Scheduled at 10:00 AM",
      route: {
        name: "Route A",
        type: "Residential",
        schedule: "Mon, Wed, Fri (06:00 - 10:00)",
        coverage: "Purok 1-3",
        collector: "Pedro Santos",
      },
    },
    {
      brgy: "Purok. 3",
      status: "In Progress",
      time: "Started at 9:15 AM",
      route: {
        name: "Route A",
        type: "Residential",
        schedule: "Mon, Wed, Fri (06:00 - 10:00)",
        coverage: "Purok 1-3",
        collector: "Pedro Santos",
      },
    },
    {
      brgy: "Purok. 4",
      status: "Not Collected",
      time: "Awaiting schedule",
      route: {
        name: "Route B",
        type: "Commercial",
        schedule: "Tue, Thu, Sat (05:00 - 09:00)",
        coverage: "Main Street, Market Area",
        collector: "Jose Garcia",
      },
    },
  ]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="text-green-500 w-6 h-6" />;
      case "Pending":
        return <Clock className="text-yellow-500 w-6 h-6" />;
      case "In Progress":
        return <Clock className="text-blue-500 w-6 h-6" />;
      default:
        return <XCircle className="text-red-500 w-6 h-6" />;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {statusData.map((item, index) => (
        <div
          key={index}
          className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {item.brgy}
            </h3>
            {getStatusIcon(item.status)}
          </div>

          {/* Status */}
          <p
            className={`text-sm font-medium ${
              item.status === "Completed"
                ? "text-green-600"
                : item.status === "Pending"
                ? "text-yellow-600"
                : item.status === "In Progress"
                ? "text-blue-600"
                : "text-red-600"
            }`}
          >
            {item.status}
          </p>
          <p className="text-gray-500 text-sm mt-1">{item.time}</p>

          {/* Route Details */}
          <div className="mt-4 border-t pt-3 text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-medium">{item.route.name}</span> -{" "}
              {item.route.type}
            </p>
            <p>🕒 {item.route.schedule}</p>
            <p>
              <MapPin className="inline w-4 h-4 mr-1 text-gray-500" />
              {item.route.coverage}
            </p>
            <p>
              <User className="inline w-4 h-4 mr-1 text-gray-500" />
              {item.route.collector}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
