"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient"; // ✅ Make sure this import path is correct

export default function GreetingCard() {
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("Resident"); // Default fallback name

  // ✅ Determine greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // ✅ Fetch current user and their name from Supabase
  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Try to fetch from "profiles" table
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      // Set userName with priority order
      setUserName(
        profileData?.name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Resident"
      );
    };

    fetchUserData();
  }, []);

  return (
    <div className="bg-gradient-to-r from-dark-red to-medium-red text-white rounded-lg p-4 sm:p-5 shadow-md fade-in transition-all">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1">
        {greeting}, {userName}! 
      </h2>
      <p className="text-xs sm:text-sm text-red-100 leading-relaxed max-w-md">
        Here’s your updated waste collection schedule. Stay organized and help keep Tambacan clean!
      </p>
    </div>
  );
}
