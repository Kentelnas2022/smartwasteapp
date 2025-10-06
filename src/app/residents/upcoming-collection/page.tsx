"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabaseClient";
import { Clock, ArrowLeft, Recycle } from "lucide-react";
import { useRouter } from "next/navigation";

// ✅ Date Formatter
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ✅ Time Formatter (24hr → 12hr)
function formatTime(timeStr: string) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const d = new Date();
  d.setHours(parseInt(h), parseInt(m), 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ✅ Normalize Purok (remove "Purok " prefix)
function normalizePurok(p: string) {
  return p.replace(/^Purok\s*/i, "").trim();
}

// ✅ Waste Type Color
function wasteColor(type?: string) {
  if (!type) return "bg-gray-200 text-gray-700";
  if (type.includes("Recyclable")) return "bg-green-600 text-white";
  if (type.includes("Non-Recyclable")) return "bg-red-600 text-white";
  if (type.includes("Toxic")) return "bg-yellow-400 text-black";
  return "bg-gray-200 text-gray-700";
}

// ✅ Upcoming Collection Card (Cleaner Design)
function UpcomingCollectionCard({
  collection,
  onClick,
}: {
  collection: any;
  onClick: () => void;
}) {
  return (
    <motion.div
      className="w-full p-5 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {formatDate(collection.date)}
        </h2>
        <Recycle size={22} className="text-[#AD2B49]" />
      </div>

      <div className="flex items-center gap-2 text-gray-700 text-sm mb-3">
        <Clock size={16} className="text-gray-500" />
        <span className="font-medium">
          {formatTime(collection.start_time)} – {formatTime(collection.end_time)}
        </span>
      </div>

      {collection.waste_type && (
        <span
          className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${wasteColor(
            collection.waste_type
          )}`}
        >
          {collection.waste_type}
        </span>
      )}
    </motion.div>
  );
}

// ✅ Modal for Details
function UpcomingCollectionModal({
  collection,
  isOpen,
  onClose,
}: {
  collection: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {formatDate(collection.date)}
            </h2>

            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <Clock size={18} />
              <span className="font-medium">
                {formatTime(collection.start_time)} –{" "}
                {formatTime(collection.end_time)}
              </span>
            </div>

            {collection.waste_type && (
              <div
                className={`mt-3 inline-block px-3 py-1 text-xs font-semibold rounded-full ${wasteColor(
                  collection.waste_type
                )}`}
              >
                {collection.waste_type}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-lg bg-[#AD2B49] text-white hover:bg-[#92233e] transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ✅ Main Component
export default function UpcomingCollectionList() {
  const [collections, setCollections] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [residentPurok, setResidentPurok] = useState<string | null>(null);
  const router = useRouter();

  // ✅ Fetch resident purok
  const fetchResidentPurok = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      let { data: profile } = await supabase
        .from("profiles")
        .select("purok")
        .eq("id", user.id)
        .single();

      if (!profile) {
        const { data: resident } = await supabase
          .from("residents")
          .select("purok")
          .eq("user_id", user.id)
          .single();
        if (resident) profile = resident;
      }

      if (profile?.purok) {
        setResidentPurok(profile.purok);
      }
    }
  };

  // ✅ Fetch upcoming collections
  const fetchCollections = async (purok: string) => {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const normalizedPurok = normalizePurok(purok);

    const { data, error } = await supabase
      .from("schedules")
      .select("schedule_id, date, start_time, end_time, waste_type, purok")
      .ilike("purok", `%${normalizedPurok}%`)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching collections:", error);
      setCollections([]);
      return;
    }

    if (data && data.length > 0) {
      const upcoming = data.filter((s) => {
        if (s.date > today) return true;
        if (s.date === today) {
          const schedTime = new Date(s.date + "T" + s.start_time);
          return schedTime >= now;
        }
        return false;
      });

      setCollections(upcoming);
    } else {
      setCollections([]);
    }
  };

  // ✅ Init
  useEffect(() => {
    fetchResidentPurok();
  }, []);

  // ✅ Watch for changes
  useEffect(() => {
    if (residentPurok) {
      fetchCollections(residentPurok);

      const channel = supabase
        .channel("upcoming-collection")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "schedules" },
          () => fetchCollections(residentPurok)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [residentPurok]);

  // ✅ UI
  if (collections.length === 0) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center px-4">
        <div className="flex items-center gap-3 w-full mb-6">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="text-black hover:text-gray-700 transition"
          >
            <ArrowLeft size={28} />
          </button>
          <h2 className="text-xl font-bold text-black">Upcoming Collection</h2>
        </div>
        <p className="text-gray-500 text-sm text-center">
          No upcoming waste collections scheduled for your purok.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      {/* ✅ Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="text-black hover:text-gray-700 transition"
        >
          <ArrowLeft size={28} />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          Upcoming Collection
        </h2>
      </div>

      {/* ✅ Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
        {collections.map((c) => (
          <UpcomingCollectionCard
            key={c.schedule_id}
            collection={c}
            onClick={() => {
              setSelected(c);
              setModalOpen(true);
            }}
          />
        ))}
      </div>

      {/* ✅ Modal */}
      {selected && (
        <UpcomingCollectionModal
          collection={selected}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
