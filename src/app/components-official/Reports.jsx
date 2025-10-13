"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { Paperclip, MessageSquare, CheckCircle, Star, Eye, MapPin } from "lucide-react";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeComment, setActiveComment] = useState(null);
  const [processingIds, setProcessingIds] = useState([]);
  const [user, setUser] = useState(null);
  const [official, setOfficial] = useState(null);
  const [feedbacks, setFeedbacks] = useState({});
  const [viewingFeedbackId, setViewingFeedbackId] = useState(null);

  // ✅ Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // ✅ Verify official role
  useEffect(() => {
    const verifyOfficial = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("officials")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setOfficial(data);
    };
    verifyOfficial();
  }, [user]);

  // ✅ Fetch reports with their latest status
  useEffect(() => {
    fetchReports();

    const channel = supabase
      .channel("reports-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setReports((prev) => [
              { ...normalizeReport(payload.new), draftResponse: "" },
              ...prev,
            ]);
          } else if (payload.eventType === "UPDATE") {
            setReports((prev) =>
              prev.map((r) =>
                r.id === payload.new.id
                  ? { ...normalizeReport(payload.new), draftResponse: r.draftResponse || "" }
                  : r
              )
            );
          } else if (payload.eventType === "DELETE") {
            setReports((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const normalizeReport = (r) => {
    let file_urls = r.file_urls;
    if (!file_urls) file_urls = [];
    if (typeof file_urls === "string") {
      try {
        file_urls = JSON.parse(file_urls);
      } catch {
        file_urls = file_urls ? [file_urls] : [];
      }
    }
    return {
      ...r,
      file_urls,
      status: r.status || "Pending",
      official_response: r.official_response || "",
      location: r.location || "No location specified",
    };
  };

  const fetchReports = async () => {
    setLoading(true);

    const { data: reportsData, error } = await supabase
      .from("reports")
      .select("id, title, description, file_urls, created_at, user_id, location")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching reports:", error.message);
      setReports([]);
      setLoading(false);
      return;
    }

    const reportIds = reportsData.map((r) => r.id);
    const { data: statusData, error: statusError } = await supabase
      .from("report_status")
      .select("report_id, status, official_response")
      .in("report_id", reportIds);

    if (statusError) {
      console.error("❌ Error fetching statuses:", statusError.message);
    }

    // ✅ Always take the *latest* status if duplicates ever exist
    const latestStatus = {};
    statusData?.forEach((s) => {
      latestStatus[s.report_id] = s;
    });

    const normalized = reportsData.map((r) => {
      const statusEntry = latestStatus[r.id];
      return {
        ...normalizeReport(r),
        status: statusEntry?.status || "Pending",
        official_response: statusEntry?.official_response || "",
        draftResponse: "",
      };
    });

    setReports(normalized);
    setLoading(false);
  };

  // ✅ Handle comment or mark resolved
  const handleRespond = async (report, resolve = false) => {
    if (!report.draftResponse && !resolve) {
      alert("Please enter a response before sending.");
      return;
    }
    if (!user || !official) {
      alert("❌ You must be logged in as an official.");
      return;
    }

    setProcessingIds((prev) => [...prev, report.id]);
    const nextStatus = resolve ? "Resolved" : "In Progress";

    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id
          ? {
              ...r,
              status: nextStatus,
              official_response: report.draftResponse || r.official_response,
              draftResponse: "",
            }
          : r
      )
    );

    try {
      const { data: updated, error } = await supabase
        .from("report_status")
        .upsert(
          {
            report_id: report.id,
            status: nextStatus,
            official_response: report.draftResponse || report.official_response,
            updated_by: user.id,
            location: report.location, // ✅ Track location in report_status
          },
          { onConflict: "report_id" }
        )
        .select("*")
        .maybeSingle();

      if (error) throw error;

      await supabase.from("activities").insert([{
        action: resolve ? "Marked report as resolved" : "Responded to report",
        type: "report_update",
        created_at: new Date().toISOString(),
      }]);

      if (report.user_id) {
        const notifMessage = resolve
          ? `Your report from ${report.location} has been marked as resolved${
              updated?.official_response ? `: ${updated.official_response}` : "."
            }`
          : ` Official responded to your report from ${report.location}: ${updated?.official_response}`;
        await supabase.from("notifications").insert([
  {
    report_id: report.id,
    user_id: report.user_id,
    message: notifMessage,
    read: false,
    status: resolve ? "Resolved" : "Responded",
  },
]);
      }
    } catch (err) {
      console.error("❌ handleRespond error:", err.message || err);
      alert("Failed to update report.");
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== report.id));
      fetchReports(); // ✅ Refresh data to keep it accurate
    }
  };

  // ✅ Fetch feedback for resolved reports
  const fetchFeedback = async (reportId) => {
    if (feedbacks[reportId]) {
      setViewingFeedbackId(viewingFeedbackId === reportId ? null : reportId);
      return;
    }

    const { data, error } = await supabase
      .from("feedback")
      .select("rating, comment, created_at")
      .eq("report_id", reportId)
      .maybeSingle();

    if (error) {
      console.error("❌ Error fetching feedback:", error.message);
      alert("Failed to load feedback.");
      return;
    }

    if (data) {
      setFeedbacks((prev) => ({ ...prev, [reportId]: data }));
      setViewingFeedbackId(reportId);
    } else {
      alert("No feedback yet for this report.");
    }
  };

  // ✅ UI
  if (loading)
    return <div className="p-6 text-center text-gray-500">Loading reports...</div>;

  if (!reports.length)
    return <div className="p-6 text-center text-gray-500">No reports yet.</div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Citizen Reports</h2>

      {reports.map((report) => (
        <div
          key={report.id}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {report.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Submitted on {new Date(report.created_at).toLocaleString()}
              </p>
              {/* ✅ Show Location */}
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                <MapPin size={14} className="text-red-500" />
                {report.location}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                report.status === "Pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : report.status === "In Progress"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {report.status}
            </span>
          </div>

          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            {report.description}
          </p>

          {report.file_urls?.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Paperclip size={14} /> Attachments:
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {report.file_urls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm hover:underline"
                  >
                    Attachment {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {report.official_response && (
            <div className="mt-3 bg-gray-50 border-l-4 border-blue-500 p-3 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Official response:</strong> {report.official_response}
              </p>
            </div>
          )}

          {/* ✅ Buttons */}
          <div className="mt-4 flex gap-3 flex-wrap">
            {report.status === "Pending" && (
              <button
                onClick={() =>
                  setActiveComment(activeComment === report.id ? null : report.id)
                }
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              >
                <MessageSquare size={16} />
                Comment
              </button>
            )}

            {report.status !== "Resolved" && (
              <button
                onClick={() => handleRespond(report, true)}
                disabled={processingIds.includes(report.id)}
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              >
                <CheckCircle size={16} />
                {processingIds.includes(report.id) ? "Processing..." : "Mark Resolved"}
              </button>
            )}

            {report.status === "Resolved" && (
              <button
                onClick={() => fetchFeedback(report.id)}
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-purple-500 text-white hover:bg-purple-600"
              >
                <Eye size={16} />
                View Feedback
              </button>
            )}
          </div>

          {/* ✅ Comment box */}
          {activeComment === report.id && (
            <div className="mt-3">
              <textarea
                value={report.draftResponse}
                onChange={(e) =>
                  setReports((prev) =>
                    prev.map((r) =>
                      r.id === report.id ? { ...r, draftResponse: e.target.value } : r
                    )
                  )
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Type your comment here..."
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => handleRespond(report, false)}
                  disabled={processingIds.includes(report.id)}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {processingIds.includes(report.id) ? "Sending..." : "Send Comment"}
                </button>
              </div>
            </div>
          )}

          {/* ✅ Feedback display */}
          {viewingFeedbackId === report.id && feedbacks[report.id] && (
            <div className="mt-4 bg-purple-50 border-l-4 border-purple-500 p-4 rounded-lg">
              <div className="flex gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className={
                      i < feedbacks[report.id].rating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              <p className="text-gray-700 italic">
                “{feedbacks[report.id].comment || "No comment provided."}”
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(feedbacks[report.id].created_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
