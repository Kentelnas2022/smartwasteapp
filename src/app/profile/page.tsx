"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    purok: "",
    mobile: "",
    email: "",
    avatar_url: "",
  });

  // Fetch profile
  useEffect(() => {
    const getProfile = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      let { data: profileData } = await supabase
        .from("profiles")
        .select("name, purok, mobile, email, avatar_url")
        .eq("id", user.id)
        .single();

      if (!profileData) {
        const { data: residentData } = await supabase
          .from("residents")
          .select("name, purok, mobile, email")
          .eq("user_id", user.id)
          .single();

        if (residentData) {
          profileData = { ...residentData, avatar_url: "" };
        }
      }

      if (profileData) {
        setProfile(profileData);
        setForm(profileData);
      }

      setLoading(false);
    };

    getProfile();
  }, [router]);

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Extract file path from Supabase public URL
  const getFilePathFromUrl = (url: string) => {
    try {
      const parts = url.split("/avatars/");
      return parts[1] || null;
    } catch {
      return null;
    }
  };

  // Handle image upload with auto-delete old file
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `avatars/${fileName}`;

    // Delete old avatar if exists
    if (form.avatar_url) {
      const oldPath = getFilePathFromUrl(form.avatar_url);
      if (oldPath) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }
    }

    // Upload new avatar
    const { error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file);

    if (error) {
      console.error("❌ Image upload failed:", error.message);
      return;
    }

    // Get public URL for new image
    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

    if (data?.publicUrl) {
      setForm({ ...form, avatar_url: data.publicUrl });
      setProfile({ ...profile, avatar_url: data.publicUrl });
    }
  };

  // Handle profile update
  const handleUpdate = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("profiles").upsert({
      id: user.id,
      name: form.name,
      purok: form.purok,
      mobile: form.mobile,
      email: form.email,
      avatar_url: form.avatar_url,
      updated_at: new Date(),
    });

    await supabase
      .from("residents")
      .update({
        name: form.name,
        purok: form.purok,
        mobile: form.mobile,
        email: form.email,
      })
      .eq("user_id", user.id);

    Swal.fire({
      icon: "success",
      title: "Profile Updated",
      text: " Your profile has been updated successfully!",
      confirmButtonColor: "#4CAF50",
    });

    setProfile(form);
    setEditing(false);
    setLoading(false);
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 relative">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-200 transition"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Profile Image */}
      <div className="relative w-32 h-32 mb-6 mt-8">
        <Image
          src={form.avatar_url || "/default-avatar.png"}
          alt="Profile"
          width={128}
          height={128}
          className="rounded-full object-cover border-4 border-white shadow-md"
        />
        {editing && (
          <label className="absolute bottom-2 right-2 bg-indigo-600 p-2 rounded-full text-white shadow cursor-pointer hover:bg-indigo-700 transition">
            <Camera size={16} />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Profile Info Card */}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-md p-6 space-y-4">
        {/* Name */}
        <div>
          <label className="text-sm text-gray-600">Full Name</label>
          {editing ? (
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full p-3 mt-1 border rounded-lg focus:ring-2 focus:ring-indigo-400 transition duration-200"
            />
          ) : (
            <p className="text-lg font-semibold">{profile.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="text-sm text-gray-600">Email</label>
          {editing ? (
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full p-3 mt-1 border rounded-lg focus:ring-2 focus:ring-indigo-400 transition duration-200"
            />
          ) : (
            <p>{profile.email}</p>
          )}
        </div>

        {/* Mobile */}
        <div>
          <label className="text-sm text-gray-600">Mobile Number</label>
          {editing ? (
            <input
              type="text"
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              className="w-full p-3 mt-1 border rounded-lg focus:ring-2 focus:ring-indigo-400 transition duration-200"
            />
          ) : (
            <p>{profile.mobile}</p>
          )}
        </div>

        {/* Purok */}
        <div>
          <label className="text-sm text-gray-600">Purok</label>
          {editing ? (
            <select
              name="purok"
              value={form.purok}
              onChange={handleChange}
              className="w-full p-3 mt-1 border rounded-lg focus:ring-2 focus:ring-indigo-400 transition duration-200"
            >
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i + 1} value={`Purok ${i + 1}`}>
                  Purok {i + 1}
                </option>
              ))}
            </select>
          ) : (
            <p>{profile.purok}</p>
          )}
        </div>
      </div>

      {/* Buttons Outside Card */}
<div className="w-full max-w-md mt-4 flex gap-3">
  {editing ? (
    <>
      <button
        onClick={() => setEditing(false)}
        className="flex-1 bg-gray-400 text-white py-3 rounded-full shadow-md hover:scale-105 hover:bg-gray-500 transition-transform duration-200"
      >
        Cancel
      </button>
      <button
        onClick={handleUpdate}
        className="flex-1 bg-green-600 text-white py-3 rounded-full shadow-md hover:scale-105 hover:bg-green-700 transition-transform duration-200"
      >
        Save Changes
      </button>
    </>
  ) : (
    <button
      onClick={() => setEditing(true)}
      className="w-full bg-indigo-600 text-white py-3 rounded-full shadow-md hover:scale-105 hover:bg-indigo-700 transition-transform duration-200"
    >
      Edit Profile
    </button>
  )}
</div>

    </div>
  );
}
