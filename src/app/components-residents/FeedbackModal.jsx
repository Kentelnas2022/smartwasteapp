"use client";

import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

export default function FeedbackModal({ isOpen, onClose, reportId, userId }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(""); // ✅ new state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ✅ Handle submit
  const handleSubmit = async () => {
    if (!rating) return alert("Please select a rating before submitting.");

    setIsSubmitting(true);

    const { error } = await supabase.from("ratings").insert([
      {
        user_id: userId,
        report_id: reportId,
        rating,
        comment, // ✅ new field
      },
    ]);

    setIsSubmitting(false);

    if (error) {
      console.error("❌ Error submitting rating:", error.message);
      alert("Failed to submit feedback. Please try again.");
      return;
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setRating(0);
      setComment("");
      onClose();
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-xl p-6 w-[90%] max-w-md text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            {!submitted ? (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Rate this resolved report
                </h2>
                <p className="text-gray-500 mb-4">
                  How satisfied are you with the resolution?
                </p>

                {/* ⭐ Rating stars */}
                <div className="flex justify-center mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(star)}
                      className="text-3xl focus:outline-none"
                    >
                      <span
                        className={`transition ${
                          star <= (hover || rating)
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                      >
                        ★
                      </span>
                    </button>
                  ))}
                </div>

                {/* 💬 Comment box */}
                <textarea
                  placeholder="Leave a comment (optional)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-lg text-white ${
                      isSubmitting
                        ? "bg-gray-400"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center space-y-3"
              >
                <span className="text-4xl">✅</span>
                <h3 className="text-lg font-semibold text-gray-700">
                  Thank you for your feedback!
                </h3>
                <p className="text-sm text-gray-500">
                  Your input helps improve our service.
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}