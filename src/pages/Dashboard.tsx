import React, { useState, useEffect } from "react";
import {
  Heart,
  Moon,
  Apple,
  Dumbbell,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase, getCurrentUserId } from "../lib/supabase";

interface LifeScore {
  overall: number;
  sleep: number;
  nutrition: number;
  exercise: number;
  relationships: number;
}

export function Dashboard() {
  const [lifeScore, setLifeScore] = useState<LifeScore>({
    overall: 85,
    sleep: 78,
    nutrition: 92,
    exercise: 88,
    relationships: 82,
  });
  const [recentData, setRecentData] = useState({
    lastSleep: "7.5 hours",
    todayCalories: "2,240",
    weekWorkouts: 4,
    lastJournal: "Yesterday",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const userId = getCurrentUserId();
      
      // Fetch recent sleep data
      const { data: sleepData } = await supabase
        .from("daily_logs")
        .select("sleep_hours, sleep_quality")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(7);

      // Fetch recent nutrition data
      const { data: nutritionData } = await supabase
        .from("daily_macros")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(7);

      // Fetch recent workout data
      const { data: workoutData } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", userId)
        .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("date", { ascending: false });

      // Calculate scores based on real data or use mock data
      const sleepScore = sleepData?.length ? 
        Math.round((sleepData[0]?.sleep_hours || 7) * 10) : 78;
      const nutritionScore = nutritionData?.length ? 92 : 92;
      const exerciseScore = workoutData?.length ? 
        Math.min(100, (workoutData.length / 7) * 100) : 88;

      setLifeScore(prev => ({
        ...prev,
        sleep: sleepScore,
        nutrition: nutritionScore,
        exercise: exerciseScore,
        overall: Math.round((sleepScore + nutritionScore + exerciseScore + prev.relationships) / 4),
      }));

      setRecentData({
        lastSleep: sleepData?.length ? `${sleepData[0]?.sleep_hours || 7.5} hours` : "7.5 hours",
        todayCalories: "2,240", // Mock data
        weekWorkouts: workoutData?.length || 4,
        lastJournal: "Yesterday", // Mock data
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const scoreData = [
    { name: "Overall", value: lifeScore.overall, fill: "#3b82f6" },
  ];

  const componentScores = [
    { name: "Sleep", value: lifeScore.sleep, color: "#8b5cf6", icon: Moon },
    { name: "Nutrition", value: lifeScore.nutrition, color: "#10b981", icon: Apple },
    { name: "Exercise", value: lifeScore.exercise, color: "#f59e0b", icon: Dumbbell },
    { name: "Relationships", value: lifeScore.relationships, color: "#ef4444", icon: Users },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Life Score Dashboard</h1>
        <p className="page-subtitle">
          Your holistic health and productivity overview
        </p>
      </div>

      {/* Overall Score */}
      <div className="card">
        <div className="flex flex-col lg:flex-row items-center justify-between">
          <div className="w-full lg:w-1/3 mb-4 lg:mb-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Overall Life Score
            </h2>
            <div className="text-6xl font-bold text-primary-600 mb-2">
              {lifeScore.overall}
            </div>
            <div className="flex items-center text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="text-sm">+3 from last week</span>
            </div>
          </div>
          <div className="w-full lg:w-2/3">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                data={scoreData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Component Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {componentScores.map((score) => (
          <div key={score.name} className="metric-card">
            <div className="flex items-center justify-center w-12 h-12 rounded-full mb-4"
                 style={{ backgroundColor: `${score.color}20` }}>
              <score.icon className="h-6 w-6" style={{ color: score.color }} />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {score.value}
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {score.name}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <Moon className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Last Sleep
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {recentData.lastSleep}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <Apple className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Today's Calories
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {recentData.todayCalories}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <Dumbbell className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                This Week's Workouts
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {recentData.weekWorkouts}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Last Journal
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {recentData.lastJournal}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
