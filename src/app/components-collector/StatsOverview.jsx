"use client";
import { motion } from "framer-motion";

export default function StatsOverview({ puroks = [] }) {
  // Deduplicate puroks by ID
  const uniquePuroks = Array.from(new Map(puroks.map((p) => [p.id, p])).values());

  const total = uniquePuroks.length;
  const completed = uniquePuroks.filter((p) => p.status === "completed").length;
  const ongoing = uniquePuroks.filter((p) => p.status === "ongoing").length;
  const notStarted = uniquePuroks.filter((p) => p.status === "not-started").length;

  const stats = [
    { label: "Completed", value: completed, color: "green" },
    { label: "Ongoing", value: ongoing, color: "yellow" },
    { label: "Not Started", value: notStarted, color: "red" },
    { label: "Total Collections", value: total, color: "black" }, // ✅ added total
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 px-2 sm:px-0">
      {stats.map((stat) => {
        const percentage =
          stat.label === "Total Collections"
            ? 100
            : total
            ? Math.round((stat.value / total) * 100)
            : 0;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 flex flex-col items-center justify-center space-y-1.5 sm:space-y-2 bg-white transition-all duration-200 hover:shadow-md"
          >
            <p
              className={`text-xs sm:text-sm font-medium text-center ${
                stat.label === "Total Collections"
                  ? "text-red-900"
                  : "text-gray-600"
              }`}
            >
              {stat.label}
            </p>

            <h2
              className={`text-lg sm:text-xl font-semibold ${
                stat.label === "Total Collections"
                  ? "text-red-900"
                  : "text-gray-900"
              }`}
            >
              {stat.value}
            </h2>

            {/* Progress Bar */}
            {stat.label !== "Total Collections" ? (
              <>
                <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mt-1 sm:mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.6 }}
                    className={`h-full rounded-full bg-${stat.color}-500`}
                  />
                </div>

                <p className="text-[11px] sm:text-xs text-gray-400">
                  {percentage}% of total
                </p>
              </>
            ) : (
              <p className="text-[11px] sm:text-xs text-gray-400">
                Overall Total
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
