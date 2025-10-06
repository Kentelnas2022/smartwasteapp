"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";

export default function ResidentProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [purok, setPurok] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) return setLoading(false);

      // Try profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfile(data);
        setName(data.name || "");
        setEmail(data.email || "");
        setMobile(data.mobile || "");
        setPurok(data.purok || "");
        setAddress(data.address || "");
        setShowCreate(false);
      } else {
        // Fallback to residents table
        const res2 = await supabase
          .from("residents")
          .select("*")
          .eq("user_id", user.id)
          .single();
        const rdata = res2.data;
        if (rdata) {
          const profileRow = {
            id: user.id,
            name: rdata.name || user.user_metadata?.full_name || user.email,
            email: rdata.email || user.email,
            mobile: rdata.mobile || "",
            purok: rdata.purok || "",
            address: rdata.address || "",
          };
          const upsert = await supabase
            .from("profiles")
            .upsert([profileRow], { onConflict: "id" });
          if (!upsert.error) {
            setProfile(profileRow);
            setName(profileRow.name || "");
            setEmail(profileRow.email || "");
            setMobile(profileRow.mobile || "");
            setPurok(profileRow.purok || "");
            setAddress(profileRow.address || "");
            setShowCreate(false);
          } else {
            setShowCreate(true);
          }
        } else {
          setShowCreate(true);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!profile && !user) return;
    setLoading(true);
    const userId = profile?.id || user?.id;
    const { error } = await supabase
      .from("profiles")
      .update({ name, email, mobile, purok, address })
      .eq("id", userId);
    if (!error) {
      setProfile({ ...(profile || {}), id: userId, name, email, mobile, purok, address });
      setEditing(false);
      setSuccess(true);
      window.dispatchEvent(new CustomEvent("residentNameUpdated"));
      setTimeout(() => setSuccess(false), 2000);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .insert([
        {
          id: user.id,
          email: email || user.email,
          name: name || user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          mobile,
          purok,
          address,
        },
      ]);
    if (!error) {
      setProfile({ id: user.id, email: email || user.email, name, mobile, purok, address });
      setShowCreate(false);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  if (showCreate) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-xl font-bold mb-4">Personal details not found</h2>
        <p className="mb-4">
          We couldn't find your personal details. Please make sure you are registered. If you just registered, try refreshing.
        </p>
        <button
          className="px-4 py-2 bg-[#AD2B49] text-white rounded-lg mt-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!profile) return <div className="p-8 text-center text-red-500">Profile not found.</div>;

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-[#fff0f6] to-[#f3e8ff] rounded-3xl shadow-2xl p-10 mt-12 relative">
      {/* Back button */}
      <button
        onClick={() => router.push("/residents")}
        aria-label="Back to residents"
        title="Back to residents"
        className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-white/95 text-[#AD2B49] flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 transform transition-colors duration-150"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <h2 className="text-3xl font-extrabold mb-6 text-[#AD2B49] text-center">My Profile</h2>

      {success && (
        <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-4 py-2 rounded-lg shadow">Profile updated!</div>
      )}

      <div className="mb-8 flex flex-col items-center">
        {/* Avatar + Upload */}
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full bg-[#AD2B49] text-white flex items-center justify-center text-3xl font-bold shadow-lg overflow-hidden">
            {profile.profile_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profile_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {profile.name
                  ? profile.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
                  : "R"}
              </div>
            )}
          </div>

          {/* File input (hidden) */}
          <input
            id="avatarInput"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              setUploading(true);
              setUploadError(null);

              try {
                const fileExt = file.name.split(".").pop();
                const filePath = `avatars/${user?.id}_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                  .from("avatars")
                  .upload(filePath, file, { upsert: true });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
                const publicUrl = data.publicUrl;

                const { error: updateError } = await supabase
                  .from("profiles")
                  .update({ profile_url: publicUrl })
                  .eq("id", user?.id);

                if (updateError) throw updateError;

                setProfile((prev: any) => ({ ...(prev || {}), profile_url: publicUrl }));
                setSuccess(true);
                setTimeout(() => setSuccess(false), 2000);
              } catch (err) {
                console.error("upload error", err);
                setUploadError((err as any)?.message || String(err));
              } finally {
                setUploading(false);
              }
            }}
          />

          {/* Upload button */}
          <label
            htmlFor="avatarInput"
            className="absolute -bottom-2 right-[-6px] bg-white rounded-full p-1 shadow cursor-pointer border border-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#AD2B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </label>

          {uploading && <div className="text-xs text-gray-500 mt-2">Uploading...</div>}
          {uploadError && <div className="text-xs text-red-500 mt-2">{uploadError}</div>}
        </div>

        {/* Name */}
        <div className="w-full">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
          {editing ? (
            <input
              className="border-2 border-[#AD2B49] rounded-xl px-4 py-2 w-full text-lg focus:outline-none focus:ring-2 focus:ring-[#AD2B49] mb-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          ) : (
            <div className="text-xl font-semibold text-gray-800 mb-2">{profile.name}</div>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
        {editing ? (
          <input
            className="border-2 border-[#AD2B49] rounded-xl px-4 py-2 w-full text-lg focus:outline-none focus:ring-2 focus:ring-[#AD2B49] mb-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        ) : (
          <div className="text-lg text-gray-700 mb-2">{profile.email}</div>
        )}
      </div>

      {/* Mobile */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Mobile</label>
        {editing ? (
          <input
            className="border-2 border-[#AD2B49] rounded-xl px-4 py-2 w-full text-lg focus:outline-none focus:ring-2 focus:ring-[#AD2B49] mb-2"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
        ) : (
          <div className="text-lg text-gray-700 mb-2">{profile.mobile}</div>
        )}
      </div>

      {/* Purok */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Purok</label>
        {editing ? (
          <input
            className="border-2 border-[#AD2B49] rounded-xl px-4 py-2 w-full text-lg focus:outline-none focus:ring-2 focus:ring-[#AD2B49] mb-2"
            value={purok}
            onChange={(e) => setPurok(e.target.value)}
          />
        ) : (
          <div className="text-lg text-gray-700 mb-2">{profile.purok}</div>
        )}
      </div>

      {/* Address */}
      <div className="mb-8">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Address</label>
        {editing ? (
          <input
            className="border-2 border-[#AD2B49] rounded-xl px-4 py-2 w-full text-lg focus:outline-none focus:ring-2 focus:ring-[#AD2B49] mb-2"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        ) : (
          <div className="text-lg text-gray-700 mb-2">{profile.address}</div>
        )}
      </div>

      {/* Actions */}
      {editing ? (
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-[#AD2B49] text-white rounded-xl font-semibold shadow hover:bg-[#c13a5c]"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-6 py-2 border-2 border-[#AD2B49] text-[#AD2B49] rounded-xl font-semibold shadow hover:bg-[#f8e1e8]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex justify-center">
          <button
            onClick={() => setEditing(true)}
            className="px-6 py-2 bg-[#AD2B49] text-white rounded-xl font-semibold shadow hover:bg-[#c13a5c]"
          >
            Edit Profile
          </button>
        </div>
      )}
    </div>
  );
}
