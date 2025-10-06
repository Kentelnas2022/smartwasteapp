"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Dialog } from "@headlessui/react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  Trash2,
  Info,
  MapPin,
  MessageSquare,
  FileText,
  BookOpen,
  Archive,
  RefreshCcw,
  PlusCircle,
} from "lucide-react";
import { supabase } from "@/supabaseClient";

export default function Dashboard() {
  const [activeEducation, setActiveEducation] = useState(0);
  const [archivedEducation, setArchivedEducation] = useState(0);
  const [allResidents, setAllResidents] = useState([]);
  const [purokData, setPurokData] = useState([]);
  const [purokList, setPurokList] = useState([]);
  const [selectedPurok, setSelectedPurok] = useState("All");
  const [totalResidents, setTotalResidents] = useState(0);
  const [complianceData, setComplianceData] = useState([]);
  const [completedCollectionsToday, setCompletedCollectionsToday] = useState(0);
  const [activities, setActivities] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collectionEfficiency, setCollectionEfficiency] = useState(0);

  const typeStyles = {
    complete: { icon: CheckCircle2, color: "text-green-600", bg: "from-green-50 to-green-100" },
    create: { icon: PlusCircle, color: "text-blue-600", bg: "from-blue-50 to-blue-100" },
    update: { icon: RefreshCcw, color: "text-yellow-600", bg: "from-yellow-50 to-yellow-100" },
    delete: { icon: Trash2, color: "text-red-600", bg: "from-red-50 to-red-100" },
    message: { icon: MessageSquare, color: "text-indigo-600", bg: "from-indigo-50 to-indigo-100" },
    report: { icon: FileText, color: "text-purple-600", bg: "from-purple-50 to-purple-100" },
  };

  // Fetch education data
  useEffect(() => {
    const fetchEducationStats = async () => {
      const { data: active } = await supabase
        .from("educational_contents")
        .select("*")
        .eq("status", "Published");
      const { data: archived } = await supabase.from("archived_education").select("*");

      if (active) setActiveEducation(active.length);
      if (archived) setArchivedEducation(archived.length);
    };
    fetchEducationStats();
  }, []);

  // Fetch residents
  useEffect(() => {
    const fetchResidents = async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, purok, mobile")
        .neq("purok", null);

      if (error) {
        console.error("Error fetching residents:", error.message || error);
        return;
      }

      setAllResidents(data || []);
      setTotalResidents((data || []).length);

      const unique = [...new Set((data || []).map((item) => item.purok))];
      setPurokList(unique);
    };
    fetchResidents();
  }, []);

  // Group residents by purok
  useEffect(() => {
    if (allResidents.length === 0) return;

    let filtered = allResidents;
    if (selectedPurok !== "All") {
      filtered = allResidents.filter((r) => r.purok === selectedPurok);
      setTotalResidents(filtered.length);
    } else {
      setTotalResidents(allResidents.length);
    }

    const grouped = filtered.reduce((acc, resident) => {
      acc[resident.purok] = (acc[resident.purok] || 0) + 1;
      return acc;
    }, {});

    const uniquePuroks = [...new Set(filtered.map((item) => item.purok))];

    const chartArray = uniquePuroks.map((purok) => ({
      name: purok,
      users: grouped[purok] || 0,
    }));

    setPurokData(chartArray);
  }, [allResidents, selectedPurok]);

  // Static compliance data
  useEffect(() => {
    setComplianceData([
      { area: "Purok 1", rate: 75 },
      { area: "Purok 2", rate: 82 },
      { area: "Purok 3", rate: 90 },
      { area: "Purok 4", rate: 85 },
      { area: "Purok 5", rate: 95 },
    ]);
  }, []);

  // ✅ Fetch completed schedules (ALL completed, not just today)
  useEffect(() => {
    const fetchCompletedSchedules = async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("status, scheduled_start, scheduled_end")
        .eq("status", "completed");

      if (error) {
        console.error("Error fetching completed schedules:", error);
        return;
      }

      // Count ALL completed schedules regardless of date
      const completedAll = data || [];
      setCompletedCollectionsToday(completedAll.length);

      // Compute average efficiency
      const efficiencies = completedAll.map((sched) => {
        const scheduledStart = new Date(sched.scheduled_start);
        const scheduledEnd = new Date(sched.scheduled_end);
        const actualEnd = scheduledEnd; // assume completed on time
        const scheduledDuration = (scheduledEnd - scheduledStart) / 60000;
        const delayMinutes = Math.max(0, (actualEnd - scheduledEnd) / 60000);
        return Math.max(0, 100 - (delayMinutes / scheduledDuration) * 100);
      });

      const avgEfficiency =
        efficiencies.length > 0
          ? (efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length).toFixed(1)
          : 0;

      setCollectionEfficiency(avgEfficiency);
    };

    fetchCompletedSchedules();

    const channel = supabase
      .channel("completed-schedules")
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, () => {
        fetchCompletedSchedules();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch recent activities
  useEffect(() => {
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, action, type, schedule_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching activities:", error.message || error);
        return;
      }

      const now = new Date();
      const filtered = (data || []).filter((activity) => {
        const created = new Date(activity.created_at);
        return now - created < 24 * 60 * 60 * 1000; // last 24h
      });

      setActivities(filtered);
    };

    fetchActivities();

    const channel = supabase
      .channel("activities-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activities" },
        () => fetchActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cards = [
    {
      id: "collections",
      title: "Completed Collections",
      value: completedCollectionsToday,
      subtitle: "All-time completed schedules",
      accent: "blue-500",
      valueColor: "text-blue-600",
      iconBg: "bg-blue-50",
      icon: Trash2,
      subtitleColor: "text-green-600",
    },
    {
      id: "compliance",
      title: "Compliance Rate",
      value: "4.7/5",
      subtitle: "+5% this month",
      accent: "green-500",
      valueColor: "text-green-600",
      iconBg: "bg-green-50",
      icon: CheckCircle2,
      subtitleColor: "text-green-600",
    },
    {
      id: "reports",
      title: "Pending Reports",
      value: 7,
      subtitle: "Needs attention",
      accent: "yellow-500",
      valueColor: "text-yellow-600",
      iconBg: "bg-yellow-50",
      icon: Info,
      subtitleColor: "text-yellow-600",
    },
    {
      id: "routes",
      title: "Active Routes",
      value: 5,
      subtitle: "All operational",
      accent: "purple-500",
      valueColor: "text-purple-600",
      iconBg: "bg-purple-50",
      icon: MapPin,
      subtitleColor: "text-green-600",
    },
    {
      id: "education",
      title: "Active Education",
      value: activeEducation,
      subtitle: "Published contents",
      accent: "indigo-500",
      valueColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      icon: BookOpen,
      subtitleColor: "text-indigo-600",
    },
    {
      id: "archived",
      title: "Archived Education",
      value: archivedEducation,
      subtitle: "Stored contents",
      accent: "red-500",
      valueColor: "text-red-600",
      iconBg: "bg-red-50",
      icon: Archive,
      subtitleColor: "text-red-600",
    },
  ];

  const [efficiencyData, setEfficiencyData] = useState([]);

  // Efficiency line chart
  useEffect(() => {
    const fetchEfficiencyData = async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("date, status")
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching efficiency data:", error);
        return;
      }

      const grouped = data.reduce((acc, sched) => {
        const day = new Date(sched.date).toLocaleString("en-US", { weekday: "short" });
        if (!acc[day]) acc[day] = { total: 0, completed: 0 };
        acc[day].total++;
        if (sched.status === "completed") acc[day].completed++;
        return acc;
      }, {});

      const chartData = Object.entries(grouped).map(([day, stats]) => ({
        day,
        efficiency: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0,
      }));

      if (chartData.length > 0) setEfficiencyData(chartData);
    };

    fetchEfficiencyData();
  }, [collectionEfficiency]);

  return (
    <section className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-6 relative overflow-hidden space-y-10">
      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
        {cards.map((card) => (
          <motion.div
            key={card.id}
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`bg-white rounded-2xl shadow-md hover:shadow-xl 
                        px-6 py-4 border-l-4 border-${card.accent}
                        flex flex-col justify-between transition-all`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col">
                <p className="text-gray-500 font-bold text-sm">{card.title}</p>
                <h2 className={`text-4xl font-extrabold ${card.valueColor} leading-tight`}>
                  {card.value}
                </h2>
              </div>
              <div className={`${card.iconBg} p-4 rounded-xl`}>
                <card.icon className={`w-9 h-9 ${card.valueColor}`} />
              </div>
            </div>
            <p className={`text-xs mt-2 ${card.subtitleColor}`}>{card.subtitle}</p>
          </motion.div>
        ))}
      </div>

      {/* Activities + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 relative z-10">
        {/* Recent Activities */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-6 hover:shadow-3xl transition">
          <h3 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-pink-600 mb-4">
            Recent Activities
          </h3>
          <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2">
            {activities.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activities</p>
            ) : (
              activities.map((activity) => {
                const style = typeStyles[activity.type] || typeStyles.update;
                const Icon = style.icon;
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center gap-3 p-3 rounded-xl 
                                bg-gradient-to-br ${style.bg} 
                                hover:bg-white hover:shadow-md transition-all`}
                  >
                    <Icon className={`w-6 h-6 ${style.color} animate-bounce`} />
                    <div>
                      <p className="font-medium text-gray-700">{activity.action}</p>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Efficiency Chart */}
        <div className="glass-card hover-lift rounded-xl sm:rounded-2xl shadow-2xl p-6 card-hover-effect">
          <h3 className="text-lg sm:text-xl font-bold gradient-text mb-4">
            Collection Efficiency
          </h3>
          <div className="chart-container h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={efficiencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="efficiency"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#6366f1" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Detailed Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-4 rounded-xl hover:shadow-md transition">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mx-auto mb-3 text-xl">
              📦
            </div>
            <h4 className="font-medium text-gray-700">Collection Efficiency</h4>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {collectionEfficiency}%
            </p>
            <p className="text-sm text-gray-500">Based on completion time</p>
          </div>

          <div className="p-4 rounded-xl hover:shadow-md transition">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600 mx-auto mb-3 text-xl">
              🏠
            </div>
            <h4 className="font-medium text-gray-700">Citizen Participation</h4>
            <p className="text-2xl font-bold text-green-600 mt-2">87.5%</p>
            <p className="text-sm text-gray-500">Active households</p>
          </div>

          <div className="p-4 rounded-xl hover:shadow-md transition">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mx-auto mb-3 text-xl">
              ♻️
            </div>
            <h4 className="font-medium text-gray-700">Waste Reduction</h4>
            <p className="text-2xl font-bold text-purple-600 mt-2">23.1%</p>
            <p className="text-sm text-gray-500">Compared to last year</p>
          </div>
        </div>
      </div>
    </section>
  );
}
