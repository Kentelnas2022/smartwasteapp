"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function Profile() {
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    username: "",
    email: "",
    phone: "",
    purok: "",
    avatar_url: "",
  });

  const [selectedFile, setSelectedFile] = useState(null); // new state for image selection

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // ✅ Fetch user and profile info
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
        .select("name, email, mobile, purok, avatar_url")
        .eq("id", user.id)
        .single();

      if (!profileData) {
        const { data: residentData } = await supabase
          .from("residents")
          .select("name, email, mobile, purok")
          .eq("user_id", user.id)
          .single();

        if (residentData) profileData = { ...residentData, avatar_url: "" };
      }

      if (profileData) {
        setProfile({
          username: profileData.name || "Unknown",
          email: profileData.email || "",
          phone: profileData.mobile || "",
          purok: profileData.purok || "",
          avatar_url: profileData.avatar_url || "/default-avatar.png",
        });
      }
      setLoading(false);
    };
    getProfile();
  }, [router]);

  // ✅ Handle input changes
  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // ✅ Handle profile picture preview only
  const handleImageSelect = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSelectedFile(file);

    const previewUrl = URL.createObjectURL(file);
    setProfile((prev) => ({ ...prev, avatar_url: previewUrl }));
  };

  // ✅ Save profile updates (including image upload if selected)
  const saveProfile = async () => {
    setIsEditMode(false);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    let avatarUrl = profile.avatar_url;

    if (selectedFile) {
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, selectedFile);

      if (uploadError) {
        Swal.fire("Upload Failed", uploadError.message, "error");
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      avatarUrl = urlData?.publicUrl;
    }

    await supabase.from("profiles").upsert({
      id: user.id,
      name: profile.username,
      email: profile.email,
      mobile: profile.phone,
      purok: profile.purok,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    });

    await supabase
      .from("residents")
      .update({
        name: profile.username,
        email: profile.email,
        mobile: profile.phone,
        purok: profile.purok,
      })
      .eq("user_id", user.id);

    setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
    setSelectedFile(null);
    setLoading(false);

    Swal.fire({
      icon: "success",
      title: "Profile Updated",
      text: "Your profile has been updated successfully!",
      confirmButtonColor: "#8B0000",
    });
  };

  // ✅ Change password securely
  const handleChangePassword = async () => {
    const { current, new: newPass, confirm } = passwordForm;

    if (!current || !newPass || !confirm) {
      Swal.fire("Missing Fields", "Please fill out all fields", "warning");
      return;
    }

    if (newPass !== confirm) {
      Swal.fire("Mismatch", "New passwords do not match", "error");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });

    if (signInError) {
      Swal.fire("Incorrect Password", "Your current password is incorrect", "error");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPass });

    if (error) {
      Swal.fire("Error", error.message, "error");
    } else {
      Swal.fire({
        icon: "success",
        title: "Password Updated",
        text: "Your password has been changed successfully!",
        confirmButtonColor: "#8B0000",
      });
      setShowPasswordModal(false);
      setPasswordForm({ current: "", new: "", confirm: "" });
    }
  };

  // ✅ Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen font-sans relative">
      {/* Header */}
      <div className="bg-[#8B0000] text-white rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-[#a30000] transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Profile</h1>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className="p-2 rounded-full hover:bg-[#a30000] transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center py-6">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-[#8B0000] shadow-inner bg-white">
            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            {isEditMode && (
              <label className="absolute bottom-1 right-1 bg-[#8B0000] p-2 rounded-full text-white cursor-pointer hover:bg-[#a30000] transition">
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 11c0-1.1.9-2 2-2h4l1-1 1 1h2v2l-1 1v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4l-1-1V9h2l1-1 1 1h4a2 2 0 012 2z"
                  />
                </svg>
              </label>
            )}
          </div>
          <h2 className="text-xl font-bold mt-3">@{profile.username}</h2>
          <p className="text-gray-200">Active User</p>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-t-3xl -mt-4 p-6">
        {!isEditMode ? (
          <>
            <ProfileItem label="Username" value={profile.username} />
            <ProfileItem label="Email" value={profile.email} />
            <ProfileItem label="Mobile Number" value={profile.phone} />
            <ProfileItem label="Purok" value={profile.purok} />

            {/* Settings */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3 text-black">Settings</h3>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full bg-gray-100 rounded-2xl p-4 text-left hover:bg-[#8B0000] hover:text-white transition"
              >
                Change Password
              </button>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full bg-red-100 rounded-2xl p-4 mt-3 text-left text-[#8B0000] font-semibold hover:bg-[#8B0000] hover:text-white transition"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <form className="space-y-4">
            <InputField label="Username" name="username" value={profile.username} onChange={handleChange} />
            <InputField label="Email" name="email" value={profile.email} onChange={handleChange} />
            <InputField label="Mobile Number" name="phone" value={profile.phone} onChange={handleChange} />
            <InputField label="Purok" name="purok" value={profile.purok} onChange={handleChange} />

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={saveProfile}
                className="flex-1 bg-[#8B0000] text-white py-3 rounded-xl hover:bg-[#a30000] transition"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="flex-1 bg-gray-200 text-black py-3 rounded-xl hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <Modal title="Change Password" onClose={() => setShowPasswordModal(false)}>
          <InputField
            label="Current Password"
            type="password"
            name="current"
            value={passwordForm.current}
            onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
          />
          <InputField
            label="New Password"
            type="password"
            name="new"
            value={passwordForm.new}
            onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
          />
          <InputField
            label="Confirm Password"
            type="password"
            name="confirm"
            value={passwordForm.confirm}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
          />
          <button
            onClick={handleChangePassword}
            className="w-full bg-[#8B0000] text-white py-3 rounded-xl mt-4 hover:bg-[#a30000] transition"
          >
            Update Password
          </button>
        </Modal>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <Modal title="Logout" onClose={() => setShowLogoutModal(false)}>
          <p className="text-gray-700 mb-4 text-center">
            Are you sure you want to logout?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="flex-1 bg-gray-200 text-black py-2 rounded-xl hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 bg-[#8B0000] text-white py-2 rounded-xl hover:bg-[#a30000] transition"
            >
              Logout
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* --- REUSABLE COMPONENTS --- */
function ProfileItem({ label, value }) {
  return (
    <div className="bg-gray-100 rounded-2xl p-4 mb-3">
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className="text-base font-medium text-black truncate">{value}</div>
    </div>
  );
}

function InputField({ label, name, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-black mb-2">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B0000] outline-none"
      />
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-black transition"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-[#8B0000] mb-4 text-center">{title}</h3>
        {children}
      </div>
    </div>
  );
}
