"use client";
import { useState, useEffect } from "react";
import Navbar from "../components-residents/Navbar";
import GreetingCard from "../components-residents/GreetingCard";
import ScheduleSection from "../components-residents/ScheduleSection";
import EducationSection from "../components-residents/EducationSection";
import ReportModal from "../components-residents/ReportModal";
import FeedbackModal from "../components-residents/FeedbackModal";
import { supabase } from "@/supabaseClient";

export default function ResidentsPage() {
  const [view, setView] = useState("schedule");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [user, setUser] = useState(null);
  const [resolvedReport, setResolvedReport] = useState(null);

  useEffect(() => {
    const checkResolvedReports = async () => {
      try {
        // ✅ Get logged-in user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        setUser(user);

        // ✅ Fetch user's latest resolved report
        const { data: reports, error } = await supabase
          .from("report_status")
          .select(`
            id,
            status,
            official_response,
            updated_at,
            report_id,
            reports!inner (title, user_id)
          `)
          .eq("reports.user_id", user.id)
          .eq("status", "Resolved")
          .order("updated_at", { ascending: false })
          .limit(1);

        if (error) {
          console.error("Error fetching resolved reports:", error);
          return;
        }

        if (reports && reports.length > 0) {
          const latestResolved = reports[0];

          // ✅ Check if feedback already exists for this report
          const { data: existingFeedback, error: feedbackError } = await supabase
            .from("feedback")
            .select("id")
            .eq("report_id", latestResolved.report_id)
            .eq("user_id", latestResolved.reports.user_id)
            .maybeSingle();

          if (feedbackError && feedbackError.message) {
            console.error("Error checking feedback:", feedbackError.message);
            return;
          }

          const feedbackExists = existingFeedback && Object.keys(existingFeedback).length > 0;

          // ✅ Only show feedback modal if no feedback exists
          if (!feedbackExists) {
            setResolvedReport(latestResolved);
            setShowFeedback(true);
          }
        }
      } catch (err) {
        console.error("Error checking resolved reports:", err);
      }
    };

    checkResolvedReports();
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Navbar */}
      <Navbar
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSchedule={() => setView("schedule")}
        onOpenEducation={() => setView("education")}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 fade-in">
        <GreetingCard />

        <div id="contentArea">
          {view === "schedule" ? <ScheduleSection /> : <EducationSection />}
        </div>
      </main>

      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />

      {/* ✅ FIXED — Pass correct IDs */}
      {showFeedback && resolvedReport && (
        <FeedbackModal
          isOpen={showFeedback}
          onClose={() => setShowFeedback(false)}
          user={{
            id: resolvedReport.reports.user_id, // ✅ correct
          }}
          report={{
            report_id: resolvedReport.report_id,
            reports: resolvedReport.reports,
            official_response: resolvedReport.official_response,
          }}
        />
      )}

      {/* Debug */}
      {console.log("✅ Passing to FeedbackModal:", {
        user_id: resolvedReport?.reports?.user_id,
        report_id: resolvedReport?.report_id,
      })}

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
      `}</style>
    </div>
  );
}
