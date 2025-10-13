"use client";
import { useState } from "react";
import Navbar from "../components-residents/Navbar";
import GreetingCard from "../components-residents/GreetingCard";
import ScheduleSection from "../components-residents/ScheduleSection";
import EducationSection from "../components-residents/EducationSection";
import ReportModal from "../components-residents/ReportModal";

export default function ResidentsPage() {
  const [view, setView] = useState("schedule");
  const [isReportOpen, setIsReportOpen] = useState(false);

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Navbar with Sidebar Controls */}
      <Navbar
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSchedule={() => setView("schedule")}
        onOpenEducation={() => setView("education")}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 fade-in">
        {/* Greeting Card */}
        <GreetingCard />

        {/* Dynamic Page Content */}
        <div id="contentArea">
          {view === "schedule" ? <ScheduleSection /> : <EducationSection />}
        </div>
      </main>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      {/* Global Animation Styles */}
      <style jsx global>{`
        .fade-in {
          animation: fadeIn 0.4s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .blur-overlay {
          backdrop-filter: blur(6px);
          background-color: rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
