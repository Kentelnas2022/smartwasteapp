"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { Star } from "lucide-react";

export default function Feedback() {
  const [user, setUser] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});

  // ✅ Fetch current resident user
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  // ✅ Fetch resolved reports belonging to this resident
  useEffect(() => {
    if (!user) return;

    const fetchResolvedReports = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("reports")
        .select(`
          id,
          title,
          description,
          created_at,
          user_id,
          report_status (status, official_response, updated_by),
          feedback (id, rating, comment)
        `)
        .eq("user_id", user.id);

      if (error) {
        console.error("❌ Error fetching feedback reports:", error.message);
        setLoading(false);
        return;
      }

      const resolved = data
        .filter((r) => r.report_status?.status === "Resolved")
        .map((r) => ({
          ...r,
          rating: r.feedback?.[0]?.rating || 0,
          comment: r.feedback?.[0]?.comment || "",
          hasFeedback: !!r.feedback?.length,
        }));

      setFeedbackList(resolved);
      setLoading(false);
    };

    fetchResolvedReports();
  }, [user]);

  const handleRating = (reportId, stars) => {
    setDrafts((prev) => ({
      ...prev,
      [reportId]: { ...prev[reportId], rating: stars },
    }));
  };

  const handleCommentChange = (reportId, text) => {
    setDrafts((prev) => ({
      ...prev,
      [reportId]: { ...prev[reportId], comment: text },
    }));
  };

  const handleSubmit = async (report) => {
    const draft = drafts[report.id];
    if (!draft?.rating || !draft?.comment) {
      alert("Please provide both rating and comment.");
      return;
    }

    const { error } = await supabase.from("feedback").insert([
      {
        report_id: report.id,
        resident_id: user.id,
        official_id: report.report_status.updated_by,
        rating: draft.rating,
        comment: draft.comment,
      },
    ]);

    if (error) {
      console.error("❌ Error submitting feedback:", error.message);
      alert("Failed to submit feedback.");
      return;
    }

    alert("✅ Feedback submitted successfully!");
    setFeedbackList((prev) =>
      prev.map((r) =>
        r.id === report.id
          ? { ...r, hasFeedback: true, rating: draft.rating, comment: draft.comment }
          : r
      )
    );
  };

  if (loading)
    return <div className="p-6 text-center text-gray-500">Loading feedback...</div>;

  if (!feedbackList.length)
    return <div className="p-6 text-center text-gray-500">No resolved reports yet.</div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Your Feedback</h2>

      {feedbackList.map((report) => (
        <div
          key={report.id}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {report.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Resolved on {new Date(report.created_at).toLocaleDateString()}
          </p>

          <div className="mt-3 text-sm text-gray-700">
            <strong>Official response:</strong>{" "}
            {report.report_status?.official_response || "N/A"}
          </div>

          {/* ⭐ Rating Section */}
          {report.hasFeedback ? (
            <div className="mt-4 bg-green-50 border-l-4 border-green-500 p-3 rounded-lg">
              <p className="font-medium text-green-800">
                You rated this report {report.rating} / 5
              </p>
              <p className="text-gray-700 mt-1 italic">“{report.comment}”</p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="font-medium text-gray-700 mb-2">Rate the official:</p>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={20}
                    className={`cursor-pointer ${
                      (drafts[report.id]?.rating || 0) >= star
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }`}
                    onClick={() => handleRating(report.id, star)}
                  />
                ))}
              </div>

              <textarea
                value={drafts[report.id]?.comment || ""}
                onChange={(e) =>
                  handleCommentChange(report.id, e.target.value)
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Leave your comment about the official’s performance..."
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => handleSubmit(report)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
