"use client";

import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

export default function FeedbackModal({ isOpen, onClose, reportId, userId }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating && !comment.trim()) return;

    setIsSubmitting(true);
    const { error } = await supabase.from("feedback").insert([
      {
        report_id: reportId,
        user_id: userId,
        rating,
        comment,
      },
    ]);

    setIsSubmitting(false);
    if (error) {
      console.error("Error submitting feedback:", error);
      return;
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
      setRating(0);
      setComment("");
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
                  How was your experience?
                </h2>
                <p className="text-gray-500 mb-4">
                  Please rate and share feedback about the report resolution.
                </p>

                {/* Star Rating */}
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

                {/* Comment Box */}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows="3"
                  placeholder="Leave a comment..."
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm mb-4 focus:ring-2 focus:ring-green-400 outline-none"
                />

                {/* Buttons */}
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
                    className={`px-4 py-2 rounded-lg text-white ${
                      isSubmitting
                        ? "bg-gray-400"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    disabled={isSubmitting}
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
                  Your feedback helps improve the community service.
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
