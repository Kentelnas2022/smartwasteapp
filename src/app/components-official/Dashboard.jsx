"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
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
  const [collectionEfficiency, setCollectionEfficiency] = useState(0);
  const [efficiencyData, setEfficiencyData] = useState([]);
  const [pendingReports, setPendingReports] = useState(0);
  const [activeRoutes, setActiveRoutes] = useState(0); // ✅ NEW STATE
  const [citizenParticipation, setCitizenParticipation] = useState(0); // NEW STATE

  const typeStyles = {
    complete: { icon: CheckCircle2, color: "text-green-600", bg: "from-green-50 to-green-100" },
    create: { icon: PlusCircle, color: "text-blue-600", bg: "from-blue-50 to-blue-100" },
    update: { icon: RefreshCcw, color: "text-yellow-600", bg: "from-yellow-50 to-yellow-100" },
    delete: { icon: Trash2, color: "text-red-600", bg: "from-red-50 to-red-100" },
    message: { icon: MessageSquare, color: "text-indigo-600", bg: "from-indigo-50 to-indigo-100" },
    report: { icon: FileText, color: "text-purple-600", bg: "from-purple-50 to-purple-100" },
  };

  // 🧠 Fetch education
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

  // 👥 Residents
  useEffect(() => {
    const fetchResidents = async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, purok, mobile")
        .neq("purok", null);

      if (error) {
        console.error("Error fetching residents:", error.message);
        return;
      }

      setAllResidents(data || []);
      setTotalResidents((data || []).length);
      setPurokList([...new Set((data || []).map((r) => r.purok))]);
    };
    fetchResidents();
  }, []);

  // Group by purok for chart
  useEffect(() => {
    if (allResidents.length === 0) return;
    const filtered =
      selectedPurok === "All"
        ? allResidents
        : allResidents.filter((r) => r.purok === selectedPurok);
    setTotalResidents(filtered.length);

    const grouped = filtered.reduce((acc, r) => {
      acc[r.purok] = (acc[r.purok] || 0) + 1;
      return acc;
    }, {});
    setPurokData(
      Object.keys(grouped).map((purok) => ({
        name: purok,
        users: grouped[purok],
      }))
    );
  }, [allResidents, selectedPurok]);

  // 🧾 Compliance (static)
  useEffect(() => {
    setComplianceData([
      { area: "Purok 1", rate: 75 },
      { area: "Purok 2", rate: 82 },
      { area: "Purok 3", rate: 90 },
      { area: "Purok 4", rate: 85 },
      { area: "Purok 5", rate: 95 },
    ]);
  }, []);

  // ✅ Active Routes based on schedule & route_points
  useEffect(() => {
    const fetchActiveRoutes = async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("status, route_points, start_time, end_time, date");

      if (error) {
        console.error("Error fetching active routes:", error);
        return;
      }

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      // ✅ Consider routes active if ongoing OR current time is within schedule today
      const activeRoutesList = (data || []).filter((sched) => {
        if (!sched.route_points) return false;
        const points = JSON.parse(sched.route_points || "[]");
        if (points.length === 0) return false;

        const start = new Date(`${sched.date}T${sched.start_time}`);
        const end = new Date(`${sched.date}T${sched.end_time}`);
        const isOngoing = sched.status?.toLowerCase() === "ongoing";
        const isNowActive = sched.date === todayStr && now >= start && now <= end;
        return isOngoing || isNowActive;
      });

      setActiveRoutes(activeRoutesList.length);
    };

    fetchActiveRoutes();

    const channel = supabase
      .channel("realtime-active-routes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        () => fetchActiveRoutes()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ✅ Completed Schedules
  useEffect(() => {
    const fetchCompleted = async () => {
      const { data } = await supabase.from("schedules").select("*").eq("status", "completed");
      setCompletedCollectionsToday((data || []).length);
    };
    fetchCompleted();
  }, []);

  // 🕒 Recent Activities
  useEffect(() => {
    const fetchActivities = async () => {
      const { data } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      const now = new Date();
      const filtered = (data || []).filter(
        (a) => now - new Date(a.created_at) < 24 * 60 * 60 * 1000
      );
      setActivities(filtered);
    };
    fetchActivities();
  }, []);

  // ✅ Pending Reports
  useEffect(() => {
    const fetchReports = async () => {
      const { data: reports } = await supabase.from("reports").select("id");
      if (!reports || reports.length === 0) return setPendingReports(0);

      const reportIds = reports.map((r) => r.id);
      const { data: statuses } = await supabase
        .from("report_status")
        .select("report_id, status")
        .in("report_id", reportIds);

      const latestStatus = {};
      statuses?.forEach((s) => (latestStatus[s.report_id] = s.status));
      const pending = reports.filter((r) => (latestStatus[r.id] || "Pending") === "Pending");
      setPendingReports(pending.length);
    };
    fetchReports();
  }, []);

  // ✅ Citizen Participation based on reports
  useEffect(() => {
    const fetchReportsForParticipation = async () => {
      const { data: reports } = await supabase.from("reports").select("id");

      if (!reports || reports.length === 0) {
        setCitizenParticipation(0);
        return;
      }

      const reportedResidents = new Set(reports.map((report) => report.resident_id));
      const participationPercentage = ((reportedResidents.size / totalResidents) * 100).toFixed(1);
      setCitizenParticipation(participationPercentage);
    };
    fetchReportsForParticipation();
  }, [totalResidents]);

  // ✅ Cards
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
      value: pendingReports,
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
      value: activeRoutes, // ✅ Dynamic active routes
      subtitle: activeRoutes > 0 ? "Currently operating" : "No active routes",
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

  // ✅ Efficiency chart (FIXED with collectionEfficiency update)
  useEffect(() => {
    const fetchEfficiency = async () => {
      const { data } = await supabase.from("schedules").select("date, status");
      if (!data || data.length === 0) {
        setEfficiencyData([]);
        setCollectionEfficiency(0);
        return;
      }

      const grouped = data.reduce((acc, s) => {
        const day = new Date(s.date).toLocaleString("en-US", { weekday: "short" });
        acc[day] = acc[day] || { total: 0, completed: 0 };
        acc[day].total++;
        if (s.status === "completed") acc[day].completed++;
        return acc;
      }, {});

      setEfficiencyData(
        Object.entries(grouped).map(([day, val]) => ({
          day,
          efficiency: val.total > 0 ? ((val.completed / val.total) * 100).toFixed(1) : 0,
        }))
      );

      // ✅ Compute average efficiency for the analytics card
      const totalCompleted = data.filter((s) => s.status === "completed").length;
      const totalSchedules = data.length;
      const avgEfficiency =
        totalSchedules > 0 ? ((totalCompleted / totalSchedules) * 100).toFixed(1) : 0;
      setCollectionEfficiency(avgEfficiency);
    };
    fetchEfficiency();
  }, []);

  // ✅ UI Render
  return (
    <section className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4 sm:p-6 relative overflow-hidden space-y-10">
      {/* Top Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
        {cards.map((card) => (
          <motion.div
            key={card.id}
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ duration: 0.15 }}
            className={`bg-white rounded-2xl shadow-md hover:shadow-xl px-4 sm:px-6 py-4 border-l-4 border-${card.accent} flex flex-col justify-between transition-all`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col">
                <p className="text-gray-500 font-bold text-xs sm:text-sm">{card.title}</p>
                <h2 className={`text-3xl sm:text-4xl font-extrabold ${card.valueColor}`}>
                  {card.value}
                </h2>
              </div>
              <div className={`${card.iconBg} p-3 sm:p-4 rounded-xl`}>
                <card.icon className={`w-7 sm:w-9 h-7 sm:h-9 ${card.valueColor}`} />
              </div>
            </div>
            <p className={`text-xs sm:text-sm mt-2 ${card.subtitleColor}`}>{card.subtitle}</p>
          </motion.div>
        ))}
      </div>

      {/* Activities + Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Recent Activities */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-4 sm:p-6 hover:shadow-3xl transition">
          <h3 className="text-base sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-pink-600 mb-4">
            Recent Activities
          </h3>
          <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1 sm:pr-2">
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
                    className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br ${style.bg} hover:bg-white hover:shadow-md transition-all`}
                  >
                    <Icon className={`w-6 h-6 ${style.color} animate-bounce`} />
                    <div>
                      <p className="font-medium text-gray-700 text-sm sm:text-base">
                        {activity.action}
                      </p>
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
        <div className="glass-card rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold gradient-text mb-4">
            Collection Efficiency
          </h3>
          <div className="h-60 sm:h-72">
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

      {/* Residents per Purok and Compliance Rate in grid layout */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
  {/* Residents per Purok */}
  <div className="bg-white rounded-2xl shadow-xl p-6 bg-gradient-to-r from-blue-50 to-indigo-100">
    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-lg">
        📊
      </span>
      Residents per Purok
    </h3>

    <p className="text-sm text-gray-500 mb-4">
      Total residents:{" "}
      <span className="font-bold text-blue-600">{totalResidents}</span>
    </p>

    {/* Dropdown */}
    <div className="flex items-center gap-3 mb-4">
      <label className="font-medium text-gray-700">Select Purok:</label>
      <select
        value={selectedPurok}
        onChange={(e) => setSelectedPurok(e.target.value)}
        className="border rounded p-1"
      >
        <option value="All">All</option>
        {purokList.map((purok) => (
          <option key={purok} value={purok}>
            {purok}
          </option>
        ))}
      </select>
    </div>

    <div className="relative h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={purokData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#6b7280" />
          <YAxis stroke="#6b7280" allowDecimals={false} />
          <Tooltip
            formatter={(value) => [`${value} residents`, "Count"]}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
            }}
          />
          <Bar dataKey="users" radius={[10, 10, 0, 0]} barSize={50}>
            {purokData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={[
                  "#3b82f6",
                  "#10b981",
                  "#f59e0b",
                  "#ef4444",
                  "#8b5cf6",
                ][index % 5]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>

  {/* Compliance Rate */}
  <div className="bg-white rounded-2xl shadow-xl p-6 bg-gradient-to-r from-green-50 to-teal-100">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100 text-green-600 text-lg">
        ✅
      </span>
      Compliance Rates by Area
    </h3>
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={complianceData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="area" stroke="#6b7280" />
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
            dataKey="rate"
            stroke="#10b981"
            strokeWidth={3}
            dot={{
              r: 6,
              fill: "#a8e0ceff",
              stroke: "white",
              strokeWidth: 2,
            }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
</div>

      {/* Detailed Analytics */}
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Detailed Analytics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 text-center">
          <div className="p-4 rounded-xl hover:shadow-md transition">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mx-auto mb-3 text-xl">
              📦
            </div>
            <h4 className="font-medium text-gray-700 text-sm sm:text-base">
              Collection Efficiency
            </h4>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-2">
              {collectionEfficiency}%
            </p>
            <p className="text-xs sm:text-sm text-gray-500">Based on completion time</p>
          </div>

          <div className="p-4 rounded-xl hover:shadow-md transition">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600 mx-auto mb-3 text-xl">
              🏠
            </div>
            <h4 className="font-medium text-gray-700 text-sm sm:text-base">
              Citizen Participation
            </h4>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-2">
              {citizenParticipation}%
            </p>
            <p className="text-xs sm:text-sm text-gray-500">Active households</p>
          </div>

          <div className="p-4 rounded-xl hover:shadow-md transition">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mx-auto mb-3 text-xl">
              ♻️
            </div>
            <h4 className="font-medium text-gray-700 text-sm sm:text-base">
             Waste Reduction Target
            </h4>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-2">50%</p>
            <p className="text-xs sm:text-sm text-gray-500">Target for this year's waste reduction</p>
          </div>
        </div>
      </div>
    </section>
  );
}
