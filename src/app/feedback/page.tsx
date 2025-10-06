"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

interface Report {
  id: string;
  title: string;
  description: string;
  user_id?: string;
}

interface StatusRow {
  // dynamic key: either report_id or reports_id
  [key: string]: any;
  status?: string;
  official_response?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

interface FeedbackInput {
  rating?: number;
  comment?: string;
}

export default function FeedbackPage() {
  const [resolvedReports, setResolvedReports] = useState<
    (Report & { status: string; official_response?: string | null })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, FeedbackInput>>({});
  const [existingFeedbacks, setExistingFeedbacks] = useState<Record<string, FeedbackInput>>(
    {}
  );
  const [userId, setUserId] = useState<string | null>(null);

  // get logged-in user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
    };
    getUser();

    // optional: subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchResolvedReports = async () => {
      if (!userId) return;
      setLoading(true);

      try {
        // 1) fetch the user's reports
        const { data: reports, error: reportsError } = await supabase
          .from("reports")
          .select("id, title, description, user_id")
          .eq("user_id", userId);

        if (reportsError) throw reportsError;
        if (!reports?.length) {
          setResolvedReports([]);
          setExistingFeedbacks({});
          setFeedbackInputs({});
          setLoading(false);
          return;
        }

        const reportIds = reports.map((r: any) => r.id);
        // 2) fetch statuses trying both possible FK column names
        const fkCandidates = ["report_id", "reports_id"];
        let statuses: StatusRow[] = [];
        let foundFk: string | null = null;
        let fetchError: any = null;

        for (const fk of fkCandidates) {
          try {
            const { data, error } = await supabase
              .from("report_status")
              .select(`${fk}, status, official_response, updated_at, created_at`)
              .in(fk, reportIds);

            // If no SQL column error and query returned (even empty array) treat this as the correct FK
            if (!error) {
              statuses = data ?? [];
              foundFk = fk;
              fetchError = null;
              break;
            } else {
              // If the error message indicates that the column doesn't exist, try next fk
              fetchError = error;
              // continue to next candidate
            }
          } catch (err) {
            fetchError = err;
          }
        }

        if (!foundFk) {
          // nothing matched — throw the last error so caller sees what's wrong
          throw fetchError || new Error("Could not find FK column in report_status (report_id/reports_id).");
        }

        // 3) pick the latest status per report id (use updated_at then created_at)
        const latestByReport: Record<string, StatusRow> = {};
        (statuses || [])
          .sort((a, b) => {
            const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
            const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
            return bTime - aTime;
          })
          .forEach((row) => {
            const rid = String(row[foundFk!]);
            if (!latestByReport[rid]) latestByReport[rid] = row;
          });

        // 4) merge and keep only Resolved statuses
        const resolved = (reports as Report[])
          .map((r) => {
            const statusRow = latestByReport[r.id];
            if (!statusRow) return null;
            const status = statusRow.status ?? "";
            if (status !== "Resolved") return null;
            return {
              ...r,
              status,
              official_response: statusRow.official_response ?? null,
            };
          })
          .filter(Boolean) as (Report & { status: string; official_response?: string | null })[];

        // 5) fetch existing feedback entries (so we can show that user already submitted)
        const { data: feedbackRows, error: feedbackError } = await supabase
          .from("feedback")
          .select("report_id, rating, comment, created_at")
          .in("report_id", reportIds)
          .eq("resident_id", userId);

        if (feedbackError) {
          // not fatal — we'll just show UI allowing new feedback
          console.warn("Could not fetch existing feedbacks:", feedbackError.message || feedbackError);
        }

        const existingMap: Record<string, FeedbackInput> = {};
        (feedbackRows ?? []).forEach((f: any) => {
          existingMap[String(f.report_id)] = {
            rating: f.rating,
            comment: f.comment,
          };
        });

        // initialize feedbackInputs for the resolved reports (prefill with existing if present)
        const inputsInit: Record<string, FeedbackInput> = {};
        resolved.forEach((r) => {
          inputsInit[r.id] = existingMap[r.id] ?? { rating: 0, comment: "" };
        });

        console.log("DEBUG Reports:", reports);
        console.log("DEBUG foundFk:", foundFk);
        console.log("DEBUG status rows (raw):", statuses);
        console.log("DEBUG latestByReport:", latestByReport);
        console.log("DEBUG resolved results:", resolved);
        console.log("DEBUG existing feedback map:", existingMap);

        setResolvedReports(resolved);
        setExistingFeedbacks(existingMap);
        setFeedbackInputs(inputsInit);
      } catch (err: any) {
        console.error("❌ Error fetching resolved reports:", err.message ?? err);
      } finally {
        setLoading(false);
      }
    };

    fetchResolvedReports();
  }, [userId]);

  // handle input change
  const handleChange = (reportId: string, field: keyof FeedbackInput, value: string | number) => {
    setFeedbackInputs((prev) => ({
      ...prev,
      [reportId]: { ...prev[reportId], [field]: value },
    }));
  };

  // submit or update feedback
  const handleFeedbackSubmit = async (reportId: string) => {
    if (!userId) {
      alert("You must be logged in to submit feedback.");
      return;
    }

    const fb = feedbackInputs[reportId] ?? {};
    if ((!fb.rating || fb.rating === 0) && (!fb.comment || fb.comment.trim() === "")) {
      alert("Please provide a rating or comment before submitting.");
      return;
    }

    try {
      // if existing feedback exists for this report by this resident, update it
      const already = existingFeedbacks[reportId];
      if (already) {
        const { error } = await supabase
          .from("feedback")
          .update({
            rating: fb.rating ?? already.rating,
            comment: fb.comment ?? already.comment,
            updated_at: new Date().toISOString(),
          })
          .eq("report_id", reportId)
          .eq("resident_id", userId);

        if (error) throw error;
        alert("✅ Feedback updated successfully!");
      } else {
        // insert new
        const { error } = await supabase.from("feedback").insert([
          {
            report_id: reportId,
            resident_id: userId,
            rating: fb.rating ?? 5,
            comment: fb.comment ?? "",
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;
        alert("✅ Feedback submitted successfully!");
      }

      // refresh local cache for this report
      setExistingFeedbacks((prev) => ({ ...prev, [reportId]: { rating: fb.rating, comment: fb.comment } }));
    } catch (err: any) {
      console.error("❌ Error submitting feedback:", err.message ?? err);
      alert("Failed to submit feedback. See console for details.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg font-semibold text-gray-600">Loading feedback...</p>
      </div>
    );
  }

  if (!resolvedReports.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <img src="/empty.svg" alt="No feedback" className="w-64 mb-6 opacity-70" />
        <h2 className="text-2xl font-semibold mb-2">No resolved reports available for feedback.</h2>
        <p className="text-gray-600">Once your reports are resolved, they’ll appear here for feedback.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Resolved Reports Feedback</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resolvedReports.map((report) => {
          const existing = existingFeedbacks[report.id];
          const input = feedbackInputs[report.id] ?? { rating: 0, comment: "" };

          return (
            <div key={report.id} className="bg-white shadow-lg rounded-2xl p-5 border border-gray-200">
              <h3 className="text-lg font-semibold mb-1 text-gray-800">{report.title}</h3>
              <p className="text-gray-600 mb-2 text-sm">{report.description}</p>
              <p className="text-green-600 font-medium">Status: {report.status}</p>
              <p className="text-blue-700 mt-2 italic">
                Official Response: {report.official_response || "No response available"}
              </p>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Rating:</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={input.rating ?? ""}
                  onChange={(e) => handleChange(report.id, "rating", Number(e.target.value))}
                  disabled={!!existing} // if existing feedback present, disable by default (you can change this)
                >
                  <option value="">Select Rating</option>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <option key={r} value={r}>
                      {r} ⭐
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-medium mt-3 mb-1">Comment:</label>
                <textarea
                  className="w-full border rounded-lg p-2"
                  placeholder="Write your feedback..."
                  rows={3}
                  value={input.comment ?? ""}
                  onChange={(e) => handleChange(report.id, "comment", e.target.value)}
                  disabled={!!existing} // disable if already exists (toggleable if you prefer)
                />

                <div className="mt-3">
                  {existing ? (
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">You already submitted feedback.</p>
                      <p className="text-gray-600 mb-2">
                        Rating: {existing.rating ?? "—"} • {existing.comment ?? "No comment"}
                      </p>
                      <button
                        onClick={() => {
                          // allow editing if desired: enable inputs by clearing existing record locally
                          setExistingFeedbacks((prev) => {
                            const copy = { ...prev };
                            delete copy[report.id];
                            return copy;
                          });
                          setFeedbackInputs((prev) => ({ ...prev, [report.id]: { rating: existing.rating, comment: existing.comment } }));
                        }}
                        className="px-3 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600"
                      >
                        Edit Feedback
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleFeedbackSubmit(report.id)}
                      className="mt-1 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Submit Feedback
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
