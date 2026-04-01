import React, { useState, useEffect } from "react";
import { Calendar, TrendingUp, Target } from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase, getCurrentUserId } from "../lib/supabase";

interface MacroData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionSummary {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  streakDays: number;
}

export function Nutrition() {
  const [viewPeriod, setViewPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [nutritionData, setNutritionData] = useState<MacroData[]>([]);
  const [summary, setSummary] = useState<NutritionSummary>({
    avgCalories: 2240,
    avgProtein: 168,
    avgCarbs: 280,
    avgFat: 75,
    streakDays: 12,
  });
  const [loading, setLoading] = useState(true);

  const targets = {
    calories: 2300,
    protein: 170,
    carbs: 290,
    fat: 80,
  };

  useEffect(() => {
    fetchNutritionData();
  }, [viewPeriod]);

  const fetchNutritionData = async () => {
    try {
      const userId = getCurrentUserId();
      
      // Calculate date range based on view period
      const daysBack = viewPeriod === "daily" ? 7 : viewPeriod === "weekly" ? 30 : 90;
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const { data: macroData } = await supabase
        .from("daily_macros")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (macroData?.length) {
        setNutritionData(macroData);
        
        // Calculate summary
        const avgCalories = macroData.reduce((sum, day) => sum + (day.total_calories || 0), 0) / macroData.length;
        const avgProtein = macroData.reduce((sum, day) => sum + (day.total_protein || 0), 0) / macroData.length;
        const avgCarbs = macroData.reduce((sum, day) => sum + (day.total_carbs || 0), 0) / macroData.length;
        const avgFat = macroData.reduce((sum, day) => sum + (day.total_fat || 0), 0) / macroData.length;

        setSummary({
          avgCalories: Math.round(avgCalories),
          avgProtein: Math.round(avgProtein),
          avgCarbs: Math.round(avgCarbs),
          avgFat: Math.round(avgFat),
          streakDays: 12, // Mock streak calculation
        });
      } else {
        // Mock data for demo
        const mockData = generateMockNutritionData(daysBack);
        setNutritionData(mockData);
      }
    } catch (error) {
      console.error("Error fetching nutrition data:", error);
      // Fallback to mock data
      const mockData = generateMockNutritionData(viewPeriod === "daily" ? 7 : 30);
      setNutritionData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const generateMockNutritionData = (days: number): MacroData[] => {
    const data: MacroData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toISOString().split("T")[0],
        calories: 2100 + Math.floor(Math.random() * 400),
        protein: 140 + Math.floor(Math.random() * 60),
        carbs: 250 + Math.floor(Math.random() * 80),
        fat: 60 + Math.floor(Math.random() * 40),
      });
    }
    return data;
  };

  const todayMacros = nutritionData[nutritionData.length - 1] || {
    calories: 2240,
    protein: 168,
    carbs: 280,
    fat: 75,
  };

  const macroDistribution = [
    { name: "Protein", value: todayMacros.protein * 4, color: "#3b82f6" },
    { name: "Carbs", value: todayMacros.carbs * 4, color: "#10b981" },
    { name: "Fat", value: todayMacros.fat * 9, color: "#f59e0b" },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading nutrition data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Nutrition Tracking</h1>
        <p className="page-subtitle">Monitor your daily macro intake and trends</p>
      </div>

      {/* Period Selector */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {["daily", "weekly", "monthly"].map((period) => (
          <button
            key={period}
            onClick={() => setViewPeriod(period as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewPeriod === period
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="metric-card">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {summary.avgCalories}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Calories</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Target: {targets.calories}
          </div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-blue-600">{summary.avgProtein}g</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Protein</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Target: {targets.protein}g
          </div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-green-600">{summary.avgCarbs}g</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Carbs</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Target: {targets.carbs}g
          </div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-orange-600">{summary.avgFat}g</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Fat</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Target: {targets.fat}g
          </div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-purple-600">{summary.streakDays}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">Logged meals</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calorie Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Calorie Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={nutritionData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip 
                labelFormatter={(value) => formatDate(value as string)}
                formatter={(value: number) => [`${value} kcal`, "Calories"]}
              />
              <Line 
                type="monotone" 
                dataKey="calories" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Today's Macro Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Today's Macro Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={macroDistribution}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {macroDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} kcal`, ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Macro Trends */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Macro Trends
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={nutritionData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip 
              labelFormatter={(value) => formatDate(value as string)}
            />
            <Bar dataKey="protein" stackId="a" fill="#3b82f6" name="Protein (g)" />
            <Bar dataKey="carbs" stackId="a" fill="#10b981" name="Carbs (g)" />
            <Bar dataKey="fat" stackId="a" fill="#f59e0b" name="Fat (g)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
