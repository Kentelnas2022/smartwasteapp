"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export function StatusModal({ purok, onClose, onUpdate }) {
  const [status, setStatus] = useState(purok?.status || "not-started");
  const [notes, setNotes] = useState(purok?.notes || "");

  if (!purok) return null;

  const options = [
    { value: "not-started", label: "Not Started", color: "red" },
    { value: "ongoing", label: "Ongoing", color: "yellow" },
    { value: "completed", label: "Completed", color: "green" },
  ];

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-xl w-full max-w-lg sm:max-w-md shadow-lg border border-gray-200 flex flex-col"
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Update Status
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg sm:text-xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Purok Info */}
          <div className="bg-gray-50 rounded-lg px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Purok Name
            </p>
            <p className="text-sm sm:text-base font-medium text-gray-900">
              {purok.purok}
            </p>
          </div>

          {/* Status Buttons */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Select Status
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition ${
                    status === opt.value
                      ? `border-${opt.color}-500 bg-${opt.color}-50 text-${opt.color}-700`
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
            <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add remarks..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={() => onUpdate({ ...purok, status, notes })}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
          >
            Update
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}