"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useRouter } from "next/navigation";

import Header from "./components-official/Header";
import NavigationTabs from "./components-official/NavigationTabs";
import Dashboard from "./components-official/Dashboard";
import Schedule from "./components-official/Schedule";
import SMS from "./components-official/SMS";
import Reports from "./components-official/Reports";
import Education from "./components-official/Education";

export default function Home() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg font-semibold">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 min-h-screen">
      <Header />
      <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="container mx-auto px-4 py-8 space-y-8">
        {activeTab === "Dashboard" && <Dashboard />}
        {activeTab === "Schedule" && <Schedule />}
        {activeTab === "SMS Alerts" && <SMS />}
        {activeTab === "Reports" && <Reports />}
        {activeTab === "Education" && <Education />}
      </main>
    </div>
  );
}
