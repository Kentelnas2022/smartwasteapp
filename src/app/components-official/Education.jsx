"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { Archive, RotateCcw, BookOpen, Layers, Plus } from "lucide-react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";

export default function Education() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contents, setContents] = useState([]);
  const [archived, setArchived] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    audience: "all",
    publishNow: false,
    media: null,
    mediaType: "",
  });

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    const { data: published } = await supabase
      .from("educational_contents")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: archivedData } = await supabase
      .from("archived_education")
      .select("*")
      .order("created_at", { ascending: false });

    setContents(published || []);
    setArchived(archivedData || []);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let type = "file";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("video/")) type = "video";
    else if (file.type === "application/pdf") type = "pdf";

    setFormData((prev) => ({
      ...prev,
      media: file,
      mediaType: type,
    }));
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    let media_url = null;

    if (!formData.title.trim()) {
      Swal.fire("Missing Title", "Please provide a title.", "warning");
      return;
    }

    if (formData.media) {
      const fileName = `${Date.now()}_${formData.media.name}`;
      const { error: uploadError } = await supabase.storage
        .from("education-media")
        .upload(fileName, formData.media);

      if (!uploadError) {
        const pub = supabase.storage.from("education-media").getPublicUrl(fileName);
        media_url = pub?.data?.publicUrl || null;
      } else {
        Swal.fire("Upload Failed", uploadError.message, "error");
        return;
      }
    }

    const newContent = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      audience: formData.audience,
      views: 0,
      status: formData.publishNow ? "Published" : "Draft",
      media_url,
      media_type: formData.mediaType,
    };

    const { data, error } = await supabase
      .from("educational_contents")
      .insert([newContent])
      .select();

    if (error) {
      Swal.fire("Save Failed", error.message, "error");
      return;
    }

    setContents((prev) => [data[0], ...prev]);
    setIsModalOpen(false);
    setFormData({
      title: "",
      category: "",
      description: "",
      audience: "all",
      publishNow: false,
      media: null,
      mediaType: "",
    });

    Swal.fire("Added!", "Your content has been saved.", "success");
  };

  const handleArchive = async (content) => {
    const result = await Swal.fire({
      title: "Archive this content?",
      text: "It will move to Archived.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, archive it",
    });

    if (!result.isConfirmed) return;

    await supabase.from("archived_education").insert([{ ...content, status: "Archived" }]);
    await supabase.from("educational_contents").delete().eq("id", content.id);

    setArchived((prev) => [content, ...prev]);
    setContents((prev) => prev.filter((c) => c.id !== content.id));

    Swal.fire("Archived!", "The content has been archived.", "success");
  };

  const handleRestore = async (content) => {
    await supabase.from("educational_contents").insert([{ ...content, status: "Published" }]);
    await supabase.from("archived_education").delete().eq("id", content.id);

    setContents((prev) => [content, ...prev]);
    setArchived((prev) => prev.filter((c) => c.id !== content.id));

    Swal.fire("Restored!", "The content has been restored.", "success");
  };

  return (
    <div className="text-gray-800">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg shadow hover:bg-green-700 transition"
          >
            <Plus className="w-5 h-5" /> Add Content
          </button>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 px-5 py-2 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-100 transition"
          >
            {showArchived ? (
              <>
                <RotateCcw className="w-5 h-5 text-green-600" /> Back to Published
              </>
            ) : (
              <>
                <Archive className="w-5 h-5 text-gray-600" /> View Archived
              </>
            )}
          </button>
        </div>

        {/* Content Section */}
        {!showArchived ? (
          <>
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-green-700">
              <BookOpen className="w-5 h-5" /> Published
            </h2>
            <div className="grid gap-4">
              {contents.length === 0 ? (
                <p className="text-gray-500">No published content.</p>
              ) : (
                contents.map((content) => (
                  <motion.div
                    key={content.id}
                    whileHover={{ scale: 1.01 }}
                    className="p-5 rounded-xl shadow border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{content.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {content.description}
                      </p>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          {content.category}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {content.audience}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleArchive(content)}
                      className="mt-3 sm:mt-0 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4" /> Archive
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-green-700">
              <Layers className="w-5 h-5" /> Archived
            </h2>
            <div className="grid gap-4">
              {archived.length === 0 ? (
                <p className="text-gray-500">No archived content.</p>
              ) : (
                archived.map((content) => (
                  <motion.div
                    key={content.id}
                    whileHover={{ scale: 1.01 }}
                    className="p-5 rounded-xl shadow border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{content.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {content.description}
                      </p>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          {content.category}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {content.audience}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestore(content)}
                      className="mt-3 sm:mt-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Restore
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Content Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4"
          >
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4 bg-white"
            >
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                📚 Add Educational Content
              </h2>
              <form onSubmit={handleAddContent} className="space-y-3">
                <input
                  type="text"
                  placeholder="Title"
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <select
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  <option value="Waste Segregation">Waste Segregation</option>
                  <option value="Recycling">Recycling</option>
                  <option value="Composting">Composting</option>
                  <option value="Waste Reduction">Waste Reduction</option>
                </select>
                <textarea
                  placeholder="Description"
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                />
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={formData.publishNow}
                    onChange={(e) => setFormData({ ...formData, publishNow: e.target.checked })}
                  />
                  Publish now
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}