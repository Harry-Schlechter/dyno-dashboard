import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Calendar, Trophy, Target } from "lucide-react";
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
  ComposedChart,
} from "recharts";
import { supabase, getCurrentUserId } from "../lib/supabase";

interface WeightData {
  date: string;
  weight: number;
  bodyFat?: number;
}

interface WorkoutData {
  date: string;
  type: string;
  duration: number;
  calories?: number;
}

interface FitnessStats {
  currentWeight: number;
  weightChange: number;
  weeklyWorkouts: number;
  totalWorkouts: number;
  avgDuration: number;
}

export function Fitness() {
  const [viewPeriod, setViewPeriod] = useState<"1m" | "3m" | "6m" | "1y">("3m");
  const [weightData, setWeightData] = useState<WeightData[]>([]);
  const [workoutData, setWorkoutData] = useState<WorkoutData[]>([]);
  const [stats, setStats] = useState<FitnessStats>({
    currentWeight: 175.2,
    weightChange: -2.3,
    weeklyWorkouts: 4,
    totalWorkouts: 23,
    avgDuration: 67,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFitnessData();
  }, [viewPeriod]);

  const fetchFitnessData = async () => {
    try {
      const userId = getCurrentUserId();
      
      // Calculate date range
      const daysBack = viewPeriod === "1m" ? 30 : 
                      viewPeriod === "3m" ? 90 : 
                      viewPeriod === "6m" ? 180 : 365;
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      // Fetch weight data
      const { data: weightDataResult } = await supabase
        .from("daily_logs")
        .select("date, weight, body_fat_percent")
        .eq("user_id", userId)
        .not("weight", "is", null)
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: true });

      // Fetch workout data
      const { data: workoutDataResult } = await supabase
        .from("workouts")
        .select("date, workout_type, duration_minutes")
        .eq("user_id", userId)
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (weightDataResult?.length) {
        const weightData = weightDataResult.map(item => ({
          date: item.date,
          weight: item.weight,
          bodyFat: item.body_fat_percent,
        }));
        setWeightData(weightData);

        // Calculate weight change
        const currentWeight = weightData[weightData.length - 1]?.weight || 175.2;
        const previousWeight = weightData[weightData.length - 8]?.weight || currentWeight;
        const weightChange = currentWeight - previousWeight;

        setStats(prev => ({
          ...prev,
          currentWeight,
          weightChange,
        }));
      } else {
        // Mock weight data
        setWeightData(generateMockWeightData(daysBack));
      }

      if (workoutDataResult?.length) {
        const workouts = workoutDataResult.map(item => ({
          date: item.date,
          type: item.workout_type,
          duration: item.duration_minutes || 60,
          calories: Math.round((item.duration_minutes || 60) * 8), // Rough estimate
        }));
        setWorkoutData(workouts);

        // Calculate workout stats
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklyWorkouts = workouts.filter(w => new Date(w.date) >= weekAgo).length;
        const avgDuration = workouts.reduce((sum, w) => sum + w.duration, 0) / workouts.length;

        setStats(prev => ({
          ...prev,
          weeklyWorkouts,
          totalWorkouts: workouts.length,
          avgDuration: Math.round(avgDuration),
        }));
      } else {
        // Mock workout data
        setWorkoutData(generateMockWorkoutData(daysBack));
      }
    } catch (error) {
      console.error("Error fetching fitness data:", error);
      // Fallback to mock data
      setWeightData(generateMockWeightData(viewPeriod === "1m" ? 30 : 90));
      setWorkoutData(generateMockWorkoutData(viewPeriod === "1m" ? 30 : 90));
    } finally {
      setLoading(false);
    }
  };

  const generateMockWeightData = (days: number): WeightData[] => {
    const data: WeightData[] = [];
    let weight = 177.5;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      weight += (Math.random() - 0.5) * 0.4; // Random weight fluctuation
      if (i % 7 === 0) { // Weekly measurement
        data.push({
          date: date.toISOString().split("T")[0],
          weight: Math.round(weight * 10) / 10,
          bodyFat: 12 + Math.random() * 2,
        });
      }
    }
    return data;
  };

  const generateMockWorkoutData = (days: number): WorkoutData[] => {
    const workoutTypes = ["Push", "Pull", "Legs", "Basketball", "Cardio", "Climbing"];
    const data: WorkoutData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      
      // Random chance of workout (about 4 per week)
      if (Math.random() < 0.57) {
        const type = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
        const duration = 45 + Math.floor(Math.random() * 45);
        data.push({
          date: date.toISOString().split("T")[0],
          type,
          duration,
          calories: Math.round(duration * (6 + Math.random() * 4)),
        });
      }
    }
    return data;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      ...(viewPeriod === "1y" ? { year: "2-digit" } : {})
    });
  };

  // Group workouts by week for better visualization
  const getWorkoutsByWeek = () => {
    const weeklyWorkouts: { [key: string]: number } = {};
    workoutData.forEach(workout => {
      const date = new Date(workout.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week
      const weekKey = weekStart.toISOString().split("T")[0];
      weeklyWorkouts[weekKey] = (weeklyWorkouts[weekKey] || 0) + 1;
    });

    return Object.entries(weeklyWorkouts).map(([date, count]) => ({
      date,
      workouts: count,
    })).slice(-12); // Last 12 weeks
  };

  const weeklyWorkouts = getWorkoutsByWeek();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading fitness data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Fitness & Weight Tracking</h1>
        <p className="page-subtitle">Monitor your weight trends and workout consistency</p>
      </div>

      {/* Period Selector */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {["1m", "3m", "6m", "1y"].map((period) => (
          <button
            key={period}
            onClick={() => setViewPeriod(period as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewPeriod === period
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {period.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="metric-card">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.currentWeight} lbs
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Current Weight</div>
          <div className={`flex items-center text-xs mt-1 ${
            stats.weightChange < 0 ? "text-green-600" : "text-red-600"
          }`}>
            {stats.weightChange < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
            {Math.abs(stats.weightChange)} lbs
          </div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-blue-600">{stats.weeklyWorkouts}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">This Week</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">Workouts</div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-green-600">{stats.totalWorkouts}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Workouts</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">This period</div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-orange-600">{stats.avgDuration}m</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">Per workout</div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-purple-600">
            {Math.round((stats.weeklyWorkouts / 7) * 100)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Consistency</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">Daily average</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Weight Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-xs"
              />
              <YAxis 
                domain={["dataMin - 2", "dataMax + 2"]}
                className="text-xs" 
              />
              <Tooltip 
                labelFormatter={(value) => formatDate(value as string)}
                formatter={(value: number) => [`${value} lbs`, "Weight"]}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Workout Frequency */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Weekly Workout Frequency
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyWorkouts}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip 
                labelFormatter={(value) => `Week of ${formatDate(value as string)}`}
                formatter={(value: number) => [`${value} workouts`, "Frequency"]}
              />
              <Bar 
                dataKey="workouts" 
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Workouts */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Workouts
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Est. Calories
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {workoutData.slice(-10).reverse().map((workout, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDate(workout.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {workout.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {workout.duration} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {workout.calories} kcal
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
