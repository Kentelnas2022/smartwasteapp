"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import {
  Send,
  Users,
  Archive,
  RotateCcw,
  BarChart3,
  Clock,
  Inbox,
  MessageSquare,
} from "lucide-react";
import Swal from "sweetalert2";

export default function SMS() {
  const [recipientGroup, setRecipientGroup] = useState("all");
  const [messageType, setMessageType] = useState("custom");
  const [message, setMessage] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [schedule, setSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [history, setHistory] = useState([]);
  const [sentToday, setSentToday] = useState(0);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("sms_archive")
      .select("*")
      .order("sent_at", { ascending: false });

    if (!error) setHistory(data || []);
    else console.error("Error fetching SMS history:", error);
  };

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayData } = await supabase
      .from("sms_archive")
      .select("*")
      .gte("sent_at", today.toISOString());

    setSentToday(todayData?.length || 0);

    const { count } = await supabase
      .from("sms_archive")
      .select("id", { count: "exact" });

    setTotalRecipients(count || 0);
  };

  const archiveMessage = async (id) => {
    const result = await Swal.fire({
      title: "Archive Message?",
      text: "Move this message to the archive?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#fbbf24",
      cancelButtonColor: "#d1d5db",
      confirmButtonText: "Yes, archive it!",
    });

    if (result.isConfirmed) {
      await supabase.from("sms_archive").update({ archived: true }).eq("id", id);
      fetchHistory();
      Swal.fire("Archived!", "The message has been archived.", "success");
    }
  };

  const restoreMessage = async (id) => {
    const result = await Swal.fire({
      title: "Restore Message?",
      text: "Move this message back to Recent?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#22c55e",
      cancelButtonColor: "#d1d5db",
      confirmButtonText: "Yes, restore it!",
    });

    if (result.isConfirmed) {
      await supabase.from("sms_archive").update({ archived: false }).eq("id", id);
      fetchHistory();
      Swal.fire("Restored!", "The message has been restored.", "success");
    }
  };

  const messageTemplates = {
    custom: "",
    collection:
      "Reminder: Waste collection will happen today. Please place your garbage outside before 6:00 AM.",
    delay:
      "Notice: Waste collection is delayed due to unforeseen circumstances. We apologize for the inconvenience.",
    education:
      "Eco Tip: Segregate your biodegradable and non-biodegradable waste to help keep our barangay clean.",
    emergency:
      "⚠️ Emergency Alert: Please be advised of an urgent waste-related announcement from Barangay Tambacan.",
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setMessageType(type);
    setMessage(messageTemplates[type]);
    setCharCount(messageTemplates[type].length);
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    setCharCount(e.target.value.length);
  };

  // ✅ UPDATED HANDLE SUBMIT — now integrates EngageSpark API
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      Swal.fire("Error", "Please enter a message before sending.", "error");
      return;
    }

    try {
      // ✅ 1. Send SMS using EngageSpark API
      const testNumber = "+639924794425"; // <-- your phone number for testing

      const response = await fetch("pages/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testNumber, message }),
      });

      const result = await response.json();

      if (!result.success) {
        Swal.fire(
          "Error",
          "Failed to send SMS via EngageSpark: " +
            (result.error?.detail || JSON.stringify(result.error)),
          "error"
        );
        return;
      }

      // ✅ 2. Archive SMS in Supabase
      const timestamp = new Date().toISOString();
      const { error } = await supabase.from("sms_archive").insert([
        {
          recipient_group: recipientGroup,
          message_type: messageType,
          message,
          scheduled_for: schedule ? scheduleTime : null,
          sent_at: timestamp,
          archived: false,
        },
      ]);

      if (error) {
        console.error("Error archiving SMS:", error);
        Swal.fire("Error", "Failed to archive SMS.", "error");
        return;
      }

      // ✅ 3. Refresh UI
      fetchHistory();
      fetchStats();
      setMessage("");
      setCharCount(0);
      setSchedule(false);
      setScheduleTime("");
      setMessageType("custom");

      Swal.fire({
        title: "✅ SMS Sent!",
        html: `
          <p>Message successfully sent via EngageSpark.</p>
          <p><strong>Recipient:</strong> ${testNumber}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `,
        icon: "success",
        confirmButtonColor: "#3085d6",
      });
    } catch (err) {
      console.error("Error:", err);
      Swal.fire("Error", err.message, "error");
    }
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 p-2 sm:p-4">
      {/* Send SMS */}
      <div className="bg-white rounded-2xl shadow-md sm:shadow-lg p-4 sm:p-6 border border-gray-100">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" /> Send SMS Alert
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Recipient Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" /> Recipient Group
            </label>
            <select
              value={recipientGroup}
              onChange={(e) => setRecipientGroup(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Residents (150 contacts)</option>
              <option value="purok1">Purok 1 (45 contacts)</option>
              <option value="purok2">Purok 2 (35 contacts)</option>
              <option value="purok3">Purok 3 (50 contacts)</option>
              <option value="commercial">
                Commercial Establishments (20 contacts)
              </option>
            </select>
          </div>

          {/* Message Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500" /> Message Type
            </label>
            <select
              value={messageType}
              onChange={handleTypeChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="custom">Custom Message</option>
              <option value="collection">Collection Reminder</option>
              <option value="delay">Collection Delay</option>
              <option value="education">Educational Tip</option>
              <option value="emergency">Emergency Alert</option>
            </select>
          </div>

          {/* Message Box */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-gray-500" /> Message
            </label>
            <textarea
              value={message}
              onChange={handleMessageChange}
              rows="4"
              maxLength="160"
              placeholder="Enter your message here..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Character count: {charCount}/160
            </p>
          </div>

          {/* Schedule */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={schedule}
              onChange={(e) => setSchedule(e.target.checked)}
              className="rounded"
            />
            <label className="text-sm text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" /> Schedule for later
            </label>
          </div>

          {schedule && (
            <div>
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 sm:py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" /> Send SMS Alert
          </button>
        </form>
      </div>

      {/* SMS History & Archive */}
      <div className="bg-white rounded-2xl shadow-md sm:shadow-lg p-4 sm:p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
            {showArchive ? (
              <>
                <Archive className="w-5 h-5 text-gray-600" /> Archived SMS
              </>
            ) : (
              <>
                <Inbox className="w-5 h-5 text-gray-600" /> Recent SMS History
              </>
            )}
          </h3>
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="text-xs sm:text-sm bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200 transition"
          >
            {showArchive ? "Show Recent" : "Show Archive"}
          </button>
        </div>

        <div className="space-y-3 sm:space-y-4 max-h-[400px] overflow-y-auto">
          {history.filter((h) => h.archived === showArchive).length === 0 ? (
            <p className="text-gray-500 italic text-center py-6 text-sm">
              {showArchive
                ? "No archived messages..."
                : "No recent messages yet..."}
            </p>
          ) : (
            history
              .filter((h) => h.archived === showArchive)
              .map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 relative"
                >
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">To:</span>{" "}
                    {entry.recipient_group}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Type:</span>{" "}
                    {entry.message_type}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Message:</span>{" "}
                    {entry.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Sent: {new Date(entry.sent_at).toLocaleString()} (
                    {entry.scheduled_for
                      ? new Date(entry.scheduled_for).toLocaleString()
                      : "Now"}
                    )
                  </p>

                  {!entry.archived ? (
                    <button
                      onClick={() => archiveMessage(entry.id)}
                      className="absolute top-2 right-2 text-xs bg-yellow-100 px-2 py-1 rounded hover:bg-yellow-200 flex items-center gap-1"
                    >
                      <Archive className="w-3 h-3" /> Archive
                    </button>
                  ) : (
                    <button
                      onClick={() => restoreMessage(entry.id)}
                      className="absolute top-2 right-2 text-xs bg-green-100 px-2 py-1 rounded hover:bg-green-200 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                  )}
                </div>
              ))
          )}
        </div>

        <div className="mt-5 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" /> SMS Analytics
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm sm:text-base">
            <div className="bg-white p-3 rounded-lg shadow-sm text-center border border-gray-100">
              <p className="text-gray-600">Sent Today</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                {sentToday}
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm text-center border border-gray-100">
              <p className="text-gray-600">Total Messages</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {totalRecipients}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
