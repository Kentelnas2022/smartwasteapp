"use client";
import { useState, useEffect } from "react";
import Navbar from "../components-residents/Navbar";
import GreetingCard from "../components-residents/GreetingCard";
import ScheduleAndEducationSection from "../components-residents/ScheduleAndEducationSection";
import ReportModal from "../components-residents/ReportModal";
import FeedbackModal from "../components-residents/FeedbackModal";
import { supabase } from "@/supabaseClient";
import Spinner from "../Spinner"; // Ensure the correct import path

export default function ResidentsPage() {
  const [view, setView] = useState("schedule");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [user, setUser] = useState(null);
  const [resolvedReport, setResolvedReport] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const checkResolvedReports = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error getting user:", userError.message);
          return;
        }
        if (!user) return;

        setUser(user);

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

          const { data: existingRating, error: ratingError } = await supabase
            .from("ratings")
            .select("id")
            .eq("user_id", latestResolved.reports.user_id)
            .eq("report_id", latestResolved.report_id)
            .maybeSingle();

          if (ratingError && ratingError.message) {
            console.error("Error checking rating:", ratingError.message);
            return;
          }

          const ratingExists = existingRating && Object.keys(existingRating).length > 0;

          if (!ratingExists) {
            setResolvedReport(latestResolved);
            setShowFeedback(true);
          }
        }
      } catch (err) {
        console.error("Error checking resolved reports:", err);
      } finally {
        setLoading(false); // Set loading to false after data is fetched
      }
    };

    checkResolvedReports();
  }, []);

  if (loading) {
    return <Spinner />; // Show the spinner while loading
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Navbar */}
      <Navbar
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSchedule={() => setView("schedule")}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 fade-in">
        <GreetingCard />

        {/* Combined Schedule + Education Section */}
        <div id="contentArea">
          <ScheduleAndEducationSection view={view} />
        </div>
      </main>

      {/* Report Modal */}
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />

      {/* Feedback Modal */}
      {showFeedback && resolvedReport && (
        <FeedbackModal
          isOpen={showFeedback}
          onClose={() => setShowFeedback(false)}
          reportId={resolvedReport.report_id}
          userId={resolvedReport.reports.user_id}
        />
      )}

      {/* Debug */}
      {console.log("Passing to FeedbackModal:", {
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
