"use client";
import { motion } from "framer-motion";

export default function StatsOverview({ puroks = [] }) {
  // Deduplicate puroks by ID to prevent repeated stats
  const uniquePuroks = Array.from(new Map(puroks.map(p => [p.id, p])).values());

  const total = uniquePuroks.length;
  const completed = uniquePuroks.filter(p => p.status === "completed").length;
  const ongoing = uniquePuroks.filter(p => p.status === "ongoing").length;
  const notStarted = uniquePuroks.filter(p => p.status === "not-started").length;

  const stats = [
    { label: "Completed", value: completed, color: "green" },
    { label: "Ongoing", value: ongoing, color: "yellow" },
    { label: "Not Started", value: notStarted, color: "red" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      {stats.map(stat => {
        const percentage = total ? Math.round((stat.value / total) * 100) : 0;

        return (
          <div
            key={stat.label}
            className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center space-y-2"
          >
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <h2 className="text-xl font-semibold text-gray-900">{stat.value}</h2>

            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.6 }}
                className={`h-2 rounded-full bg-${stat.color}-500`}
              />
            </div>

            <p className="text-xs text-gray-400">{percentage}% of total</p>
          </div>
        );
      })}
    </div>
  );
}