"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabaseClient";

// Single Content Card + Modal
function ContentCard({
  content,
}: {
  content: {
    id: number;
    title: string;
    description: string;
    category: string;
    media_url?: string;
    media_type?: string;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Card */}
      <motion.div
        className="w-full mx-auto p-5 rounded-2xl 
                   bg-white/70 backdrop-blur-md
                   border border-gray-200 shadow-sm hover:shadow-md 
                   transition-all"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.4 }}
      >
        {/* Title */}
        <h2 className="text-base sm:text-lg font-semibold text-[#AD2B49]">
          {content.title}
        </h2>

        {/* Short Description */}
        <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-2">
          {content.description}
        </p>

        {/* Learn More Button */}
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 mt-4 px-3 py-2 text-sm font-medium
                     rounded-lg text-white bg-red-900 hover:bg-red-900
                     transition-colors"
        >
          Learn More
        </button>
      </motion.div>

      {/* Modal */}
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
              {/* Title */}
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {content.title}
              </h2>

              {/* Category */}
              <p className="text-sm text-gray-500 mb-4">
                Category: {content.category}
              </p>

              {/* Media */}
              {content.media_type === "image" && content.media_url && (
                <img
                  src={content.media_url}
                  alt="Educational Media"
                  className="w-full h-56 object-cover rounded-lg mb-4"
                />
              )}
              {content.media_type === "video" && content.media_url && (
                <video
                  src={content.media_url}
                  controls
                  className="w-full h-56 rounded-lg mb-4"
                />
              )}
              {content.media_type === "pdf" && content.media_url && (
                <iframe
                  src={content.media_url}
                  className="w-full h-56 rounded-lg mb-4"
                />
              )}

              {/* Full Description */}
              <p className="text-gray-700 leading-relaxed">
                {content.description}
              </p>

              {/* Close Button */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Wrapper that fetches all contents from Supabase
export default function EducationalContentList() {
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContents = async () => {
      const { data, error } = await supabase
        .from("educational_contents")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setContents(data);
      }
      setLoading(false);
    };

    fetchContents();
  }, []);

  if (loading) {
    return <p className="text-center text-gray-500">Loading...</p>;
  }

  if (contents.length === 0) {
    return (
      <p className="text-center text-gray-500">
        No educational content available.
      </p>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <h1 className="text-lg font-semibold text-red-900">
          Educational Content
        </h1>
      </div>

      {/* Content Grid */}
      <div
        className="grid gap-6 px-4 py-6 
                   sm:grid-cols-2 
                   lg:grid-cols-3 
                   max-w-6xl mx-auto"
      >
        {contents.map((content) => (
          <ContentCard key={content.id} content={content} />
        ))}
      </div>
    </div>
  );
}