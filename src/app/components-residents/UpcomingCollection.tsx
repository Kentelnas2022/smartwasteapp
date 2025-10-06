"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabaseClient";
import { Calendar, Clock, MapPin, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

// Card for a single upcoming collection
function UpcomingCollectionCard({ collection, onClick }: { collection: any; onClick: () => void }) {
  return (
    <motion.div
      className="w-full max-w-md mx-auto p-6 rounded-2xl bg-gradient-to-br from-white/90 to-emerald-50 backdrop-blur-lg border border-gray-200 shadow-md hover:shadow-lg transition-all cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
    >
      <h2 className="text-base sm:text-lg md:text-xl font-semibold text-emerald-700">
        {collection.day}, {collection.date}
      </h2>
      <div className="flex items-center gap-2 text-gray-600 mt-2">
        <Clock size={18} />
        <span>{collection.time}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-600 mt-2">
        <MapPin size={18} />
        <span>Purok {collection.purok}</span>
      </div>
      <button className="mt-4 px-3 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">
        View Details
      </button>
    </motion.div>
  );
}

// Modal for collection details
function UpcomingCollectionModal({ collection, isOpen, onClose }: { collection: any; isOpen: boolean; onClose: () => void }) {
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
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {collection.day}, {collection.date}
            </h2>
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Clock size={18} />
              <span>{collection.time}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <MapPin size={18} />
              <span>Purok {collection.purok}</span>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
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

// Main Upcoming Collection List

export default function UpcomingCollectionList() {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchCollections = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .gt("date", today)
        .order("date", { ascending: true });
      if (!error && data) {
        setCollections(data);
      }
      setLoading(false);
    };
    fetchCollections();
  }, []);

  if (loading) {
    return <p className="text-center text-gray-500">Loading...</p>;
  }

  if (collections.length === 0) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="p-2 rounded-full bg-white shadow hover:bg-emerald-50 border border-gray-200 transition-colors text-emerald-700 hover:text-emerald-900"
            style={{ width: 40, height: 40 }}
          >
            <ArrowLeft size={24} />
          </button>
          <span className="text-2xl font-bold text-emerald-700">Upcoming Collection Dates</span>
        </div>

      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="p-2 rounded-full bg-white shadow hover:bg-emerald-50 border border-gray-200 transition-colors text-emerald-700 hover:text-emerald-900"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={24} />
        </button>
      </div>
      <div className="grid gap-6">
        {collections.map((collection) => (
          <UpcomingCollectionCard
            key={collection.schedule_id}
            collection={collection}
            onClick={() => {
              setSelected(collection);
              setModalOpen(true);
            }}
          />
        ))}
        {selected && (
          <UpcomingCollectionModal
            collection={selected}
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
