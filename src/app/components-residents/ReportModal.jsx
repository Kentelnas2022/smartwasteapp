"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import Swal from "sweetalert2"; // ✅ Import SweetAlert2

export default function ReportModal({ isOpen, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);

  // ✅ Track login session
  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  // ✅ Submit report to Supabase
  async function handleSubmit(e) {
    e.preventDefault();

    if (!session?.user) {
      Swal.fire({
        icon: "error",
        title: "Login Required",
        text: "You must be logged in to submit a report.",
        confirmButtonColor: "#b91c1c",
      });
      return;
    }

    if (!title || !description || !location) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill in all required fields before submitting.",
        confirmButtonColor: "#b91c1c",
      });
      return;
    }

    setLoading(true);

    try {
      const userId = session.user.id;
      const uploadedUrls = [];

      // ✅ Upload files
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const filePath = `reports/${userId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("reports-files")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const { data: signedData, error: signedError } = await supabase.storage
          .from("reports-files")
          .createSignedUrl(filePath, 3600);

        if (signedError) throw signedError;

        uploadedUrls.push(signedData.signedUrl);
      }

      // ✅ Insert into database
      const { data, error: insertError } = await supabase.from("reports").insert([
        {
          title,
          description,
          location,
          file_urls: uploadedUrls,
          user_id: userId,
        },
      ]).select();

      if (insertError) throw insertError;

      // ✅ SweetAlert success message
      Swal.fire({
        icon: "success",
        title: "Report Submitted!",
        text: "Your report has been sent successfully. We'll investigate soon.",
        confirmButtonColor: "#16a34a",
      });

      // ✅ NEW: Add Notification Trigger (for Navbar Bell)
      // This will automatically appear in your Navbar's real-time notification listener
      if (data && data[0]) {
        const report = data[0];
        await supabase
          .from("notifications")
          .insert([
            {
              user_id: userId,
              report_id: report.id,
              message: `You submitted a new report: ${report.title}`,
              status: "Pending",
              created_at: new Date(),
            },
          ]);
      }

      e.target.reset();
      setTitle("");
      setDescription("");
      setLocation("");
      setFiles([]);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error submitting report:", err);
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: err.message || "Failed to submit report. Please try again later.",
        confirmButtonColor: "#b91c1c",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-white/30"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Report an Issue</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Type
              </label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dark-red focus:border-transparent"
                required
              >
                <option value="">Select issue</option>
                <option>Missed Collection</option>
                <option>Illegal Dumping</option>
                <option>Damaged Bin</option>
                <option>Overflowing Bin</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter address or location"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dark-red focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dark-red focus:border-transparent"
                required
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Photo (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dark-red focus:border-transparent"
              />
              {files.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {files.length} file(s) selected
                </p>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-dark-red text-white rounded-lg hover:bg-red-800 transition-colors disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
