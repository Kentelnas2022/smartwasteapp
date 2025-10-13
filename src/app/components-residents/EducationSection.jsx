"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

export default function EducationSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchContents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("educational_contents")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (mounted) setItems(data || []);
      } catch (err) {
        console.error("fetch educational contents error:", err);
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchContents();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 fade-in relative">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        Educational Content
      </h2>

      {/* 🔄 Loading & Error */}
      {loading && <p className="text-black">Loading educational content...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* ✅ Supabase Dynamic Content */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-black mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-black mb-1">
                <span className="font-semibold text-black">
                  Segregation Type:
                </span>{" "}
                {item.category || "General"}
              </p>
              <p className="text-sm text-black mb-3 line-clamp-3">
                {item.description || "No description provided."}
              </p>
              <button
                onClick={() => setSelectedItem(item)}
                className="text-sm bg-dark-red text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-colors"
              >
                Learn More
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 📞 Contact Section (Need Help) */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Need Help?</h3>
        <p className="text-black mb-4">
          Contact our waste management team for questions or special requests:
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="bg-dark-red text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-colors">
            Call (555) 123-4567
          </button>
          <button className="bg-medium-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            Email Support
          </button>
        </div>
      </div>

      {/* 🎥 Modal for Learn More */}
      {selectedItem && (
        <div
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          // ✅ replaced bg-black bg-opacity-50 with backdrop-blur-sm for blur effect
        >
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✖
            </button>

            <h3 className="text-xl font-bold text-black mb-2">
              {selectedItem.title}
            </h3>
            <p className="text-sm text-black mb-3">
              <span className="font-semibold">Segregation Type:</span>{" "}
              {selectedItem.category || "General"}
            </p>
            <p className="text-black mb-4">{selectedItem.description}</p>

            {selectedItem.media_url &&
              selectedItem.media_type?.startsWith("video") && (
                <video
                  src={selectedItem.media_url}
                  controls
                  className="rounded-md w-full h-64 object-cover"
                />
              )}
            {!selectedItem.media_url && (
              <p className="text-sm text-gray-500 italic">
                No video provided.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
