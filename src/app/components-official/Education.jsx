"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { Archive, RotateCcw, BookOpen, Layers, Plus, ExternalLink } from "lucide-react";
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
    <div className="text-gray-800 min-h-screen py-8">
      <div className="px-4 sm:px-6 max-w-5xl mx-auto">
        {/* Header Buttons Section */}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-between sm:items-center mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 sm:px-5 sm:py-2 rounded-lg shadow hover:bg-green-700 transition justify-center text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Add Content
          </button>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2 rounded-lg border border-gray-300 bg-white shadow-sm hover:bg-gray-50 transition justify-center text-sm sm:text-base text-gray-700"
          >
            {showArchived ? (
              <>
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /> Back
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" /> Archived
              </>
            )}
          </button>
        </div>

        {/* Content Section */}
        {!showArchived ? (
          <>
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-black">
              <BookOpen className="w-5 h-5" /> Published
            </h2>
            <div className="grid gap-4">
              {contents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No published content yet.</p>
              ) : (
                contents.map((content) => (
                  <motion.div
                    key={content.id}
                    whileHover={{ scale: 1.01 }}
                    className="p-5 rounded-xl shadow-md bg-white border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center transition hover:shadow-lg"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900">{content.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {content.description}
                      </p>

                      {/* Media Preview */}
                      {content.media_url && (
                        <a
                          href={content.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 mt-2 text-green-600 hover:underline text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Uploaded File
                        </a>
                      )}

                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          {content.category}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                          {content.audience}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleArchive(content)}
                      className="mt-3 sm:mt-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow flex items-center gap-2 text-sm"
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
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-black">
              <Layers className="w-5 h-5" /> Archived
            </h2>
            <div className="grid gap-4">
              {archived.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No archived content.</p>
              ) : (
                archived.map((content) => (
                  <motion.div
                    key={content.id}
                    whileHover={{ scale: 1.01 }}
                    className="p-5 rounded-xl shadow-md bg-white border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center transition hover:shadow-lg"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900">{content.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {content.description}
                      </p>

                      {/* Media Preview for Archived */}
                      {content.media_url && (
                        <a
                          href={content.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 mt-2 text-green-600 hover:underline text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Uploaded File
                        </a>
                      )}

                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          {content.category}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                          {content.audience}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestore(content)}
                      className="mt-3 sm:mt-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow flex items-center gap-2 text-sm"
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
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 p-4"
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
                <option value="Hazardous Waste">Hazardous Waste</option>
                <option value="Proper Disposal">Proper Disposal</option>
                <option value="Plastic Waste Management">Plastic Waste Management</option>
                <option value="E-Waste Management">E-Waste Management</option>
                <option value="Water Conservation">Water Conservation</option>
                <option value="Clean Community Practices">Clean Community Practices</option>
                <option value="Environmental Awareness">Environmental Awareness</option>
                <option value="Sustainable Living">Sustainable Living</option>
                <option value="Health and Safety">Health and Safety</option>
                <option value="Waste Collection Etiquette">Waste Collection Etiquette</option>

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
                  className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                />
                <label className="flex items-center gap-2 text-sm text-gray-700">
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