"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { XMarkIcon } from "@heroicons/react/24/outline";

export function StatusModal({ purok, onClose, onUpdate }) {
  const [status, setStatus] = useState(purok?.status || "not-started");
  const [notes, setNotes] = useState(purok?.notes || "");
  const [isUpdating, setIsUpdating] = useState(false);

  if (!purok) return null;

  const options = [
    { value: "not-started", label: "Not Started", color: "red" },
    { value: "ongoing", label: "Ongoing", color: "yellow" },
    { value: "completed", label: "Completed", color: "green" },
  ];

  const handleUpdateClick = async () => {
    setIsUpdating(true);

    try {
      // Call your update function
      await onUpdate({ ...purok, status, notes });

      // Show success alert
      Swal.fire({
        title: "Status Updated!",
        text: `${purok.purok} has been successfully updated.`,
        icon: "success",
        confirmButtonColor: "#7f1d1d", // red-900
        background: "#fff",
        color: "#000",
        confirmButtonText: "OK",
      });

      onClose();
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Update Failed",
        text: "There was an issue updating the status. Please try again.",
        icon: "error",
        confirmButtonColor: "#7f1d1d",
        background: "#fff",
        color: "#000",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 15 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 bg-red-900">
          <h3 className="text-white text-lg font-semibold tracking-wide">
            Update Status
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-white hover:bg-white/20 rounded-full transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 bg-white overflow-y-auto max-h-[70vh]">
          {/* Purok Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">
              Purok Name
            </p>
            <p className="text-sm sm:text-base font-semibold text-black mt-1">
              {purok.purok}
            </p>
          </div>

          {/* Status Selector */}
          <div>
            <p className="text-sm font-semibold text-black mb-3">
              Select Status
            </p>
            <div className="grid grid-cols-3 gap-3">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                    status === opt.value
                      ? `border-${opt.color}-500 bg-${opt.color}-50 text-${opt.color}-700 ring-1 ring-${opt.color}-200`
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full bg-${opt.color}-500`}
                  ></span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-sm font-semibold text-black mb-2">Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="4"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-black focus:ring-2 focus:ring-red-900 focus:border-red-900 placeholder-gray-400 resize-none"
              placeholder="Add remarks about this purok..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-5 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black hover:bg-gray-100 transition w-full sm:w-auto font-medium"
          >
            Cancel
          </button>
          <button
            disabled={isUpdating}
            onClick={handleUpdateClick}
            className={`px-5 py-2 bg-red-900 text-white rounded-lg shadow-md transition w-full sm:w-auto font-medium ${
              isUpdating ? "opacity-70 cursor-not-allowed" : "hover:bg-red-800"
            }`}
          >
            {isUpdating ? "Updating..." : "Update"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
