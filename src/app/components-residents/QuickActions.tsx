"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  MessageSquare,
  BookOpen,
  CalendarDays,
} from "lucide-react";
import ReportFormModal from "./ReportFormModal";

type Action = {
  label: string;
  icon: React.ElementType;
  href?: string;
  type?: "modal" | "link";
};

export default function QuickActions() {
  const [isReportOpen, setIsReportOpen] = useState(false);

  const actions: Action[] = [
    { label: "Report", icon: AlertTriangle, type: "modal" },
    { label: "Feedback", icon: MessageSquare, href: "/feedback", type: "link" }, // ✅ goes to app/feedback/page.jsx
    { label: "Educational Content", icon: BookOpen, href: "/educational", type: "link" },
    {
      label: "Upcoming Collection",
      icon: CalendarDays,
      href: "/residents/upcoming-collection",
      type: "link",
    },
  ];

  return (
    <div className="w-full text-center">
      <h2 className="text-lg font-semibold mb-5">Quick Actions</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          const ActionContent = (
            <motion.div
              key={idx}
              className="group flex flex-col items-center justify-center p-6 w-36 h-36 
                         rounded-2xl bg-white shadow-md hover:shadow-xl transition-all cursor-pointer"
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (action.type === "modal") {
                  setIsReportOpen(true);
                }
              }}
            >
              <div
                className="flex items-center justify-center w-14 h-14 rounded-full 
                           bg-[#AD2B49]/10 text-[#AD2B49] 
                           group-hover:bg-[#AD2B49] group-hover:text-white transition-all duration-300"
              >
                <Icon size={28} strokeWidth={2} />
              </div>
              <span className="mt-3 text-sm font-medium text-gray-700 group-hover:text-[#AD2B49]">
                {action.label}
              </span>
            </motion.div>
          );

          // ✅ Use Next.js <Link> for navigation
          return action.type === "link" && action.href ? (
            <Link key={idx} href={action.href}>
              {ActionContent}
            </Link>
          ) : (
            <div key={idx}>{ActionContent}</div>
          );
        })}
      </div>

      {/* Report Modal */}
      <ReportFormModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
}
