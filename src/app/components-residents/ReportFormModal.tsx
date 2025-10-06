"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabaseClient";

export default function ReportFormModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  // Initialize session
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const finalTitle = title === "Other" ? customTitle : title;
    if (!finalTitle?.trim() || !description?.trim()) {
      setErrorMsg("Please fill in title and description.");
      return;
    }

    if (!session?.user) {
      setErrorMsg("You must be logged in to submit a report.");
      return;
    }

    setLoading(true);
    try {
      const userId = session.user.id;

      // Upload files to private bucket & get signed URLs
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "";
        const filePath = `reports/${userId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("reports-files")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;

        const { data: signedData, error: signedError } = await supabase.storage
          .from("reports-files")
          .createSignedUrl(filePath, 3600); // valid 1 hour
        if (signedError) throw signedError;

        uploadedUrls.push(signedData.signedUrl);
      }

      // Insert report (RLS-safe)
      const { error: insertError } = await supabase.from("reports").insert([
        {
          title: finalTitle,
          description,
          file_urls: uploadedUrls,
          user_id: userId,
        },
      ]);
      if (insertError) throw insertError;

      setSuccessMsg("Report submitted successfully!");
      setTitle("");
      setCustomTitle("");
      setDescription("");
      setFiles([]);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Report submit error:", err);
      setErrorMsg(err?.message || "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.24 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Submit a Report
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative w-full">
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="peer w-full px-4 pt-5 pb-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-[#AD2B49] focus:border-[#AD2B49] outline-none transition"
                  required
                >
                  <option value="" disabled hidden></option>
                  <option value="Missed Pickup">Missed Pickup</option>
                  <option value="Illegal Dumping">Illegal Dumping</option>
                  <option value="Uncollected Garbage">Uncollected Garbage</option>
                  <option value="Other">Other</option>
                </select>
                <label className="absolute left-4 top-2.5 text-gray-500 dark:text-gray-400 text-sm transition-all duration-200 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#AD2B49]">
                  Report Title
                </label>
              </div>

              {title === "Other" && (
                <div className="relative w-full">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder=" "
                    className="peer w-full px-4 pt-5 pb-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-[#AD2B49] focus:border-[#AD2B49] outline-none transition"
                    required
                  />
                  <label className="absolute left-4 top-2.5 text-gray-500 dark:text-gray-400 text-sm transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#AD2B49]">
                    Enter Custom Title
                  </label>
                </div>
              )}

              <div className="relative w-full">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder=" "
                  className="peer w-full px-4 pt-5 pb-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 resize-none focus:ring-2 focus:ring-[#AD2B49] focus:border-[#AD2B49] outline-none transition"
                  required
                />
                <label className="absolute left-4 top-0.5 text-gray-500 dark:text-gray-400 text-sm transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#AD2B49]">
                  Description
                </label>
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Attach Files (optional)
                </label>
                <label className="flex items-center justify-center px-4 py-2 bg-[#AD2B49]/10 text-[#AD2B49] rounded-lg cursor-pointer hover:bg-[#AD2B49]/20 transition text-sm font-medium w-fit">
                  Choose Files
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,video/*"
                  />
                </label>
                {files.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-300">
                    {files.length} file(s) selected
                  </p>
                )}
              </div>

              {errorMsg && <div className="text-sm text-red-500">{errorMsg}</div>}
              {successMsg && (
                <div className="text-sm text-green-600">{successMsg}</div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-[#AD2B49] hover:bg-[#92263E] transition disabled:opacity-60"
                >
                  {loading ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
