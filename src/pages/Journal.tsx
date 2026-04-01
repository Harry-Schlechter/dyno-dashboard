import React, { useState } from "react";
import { Calendar, Search, Filter, BookOpen, Plus } from "lucide-react";

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  tags: string[];
  mood?: string;
  weather?: string;
}

export function Journal() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Mock journal entries - in production, these would come from markdown files
  const journalEntries: JournalEntry[] = [
    {
      id: "1",
      date: "2026-03-31",
      title: "Great day at work and climbing session",
      content: "Had a really productive day at Trinity. Finished the authentication refactor and got good feedback from the team. Evening climbing session was amazing - finally sent that V3 I've been working on for weeks. The key was trusting my feet more and not over-gripping. Sydney was super encouraging and even gave me some beta that helped. Feeling really good about the progress both at work and with climbing.",
      tags: ["work", "climbing", "achievement"],
      mood: "happy",
      weather: "sunny"
    },
    {
      id: "2", 
      date: "2026-03-30",
      title: "Weekend planning and meal prep",
      content: "Spent the morning doing meal prep for the week. Made my usual chicken and rice bowls with some variations - added different vegetables and sauces to keep it interesting. Sydney helped with prep which made it way more fun. We're planning to check out that new climbing gym in Brooklyn this weekend. Also need to finish reviewing that PR for the LinedUp project.",
      tags: ["meal-prep", "weekend", "planning"],
      mood: "content",
      weather: "cloudy"
    },
    {
      id: "3",
      date: "2026-03-29", 
      title: "Basketball league game and evening thoughts",
      content: "League game tonight - we won 78-72! I played really well, hitting 5 threes and playing solid defense. Coach complimented my court vision. Still need to work on my free throws though, went 6/10. After the game, Sydney and I talked about our summer plans. Really excited about the wedding planning but also feeling the pressure of making all the right decisions. Need to remember to take it one step at a time.",
      tags: ["basketball", "sports", "relationship", "wedding"],
      mood: "excited",
      weather: "clear"
    }
  ];

  const allTags = Array.from(new Set(journalEntries.flatMap(entry => entry.tags)));

  const filteredEntries = journalEntries.filter(entry => {
    const matchesSearch = searchTerm === "" || 
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = selectedTag === null || entry.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      weekday: "short",
      month: "short", 
      day: "numeric",
      year: "numeric"
    });
  };

  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case "happy": return "😊";
      case "excited": return "🎉";
      case "content": return "😌";
      case "thoughtful": return "🤔";
      case "sad": return "😢";
      default: return "📝";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Journal Entries</h1>
        <p className="page-subtitle">
          Daily reflections and thoughts (stored as markdown files)
        </p>
      </div>

      {/* Placeholder Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Journal System Coming Soon
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              This page will display journal entries stored as markdown files. Currently showing mock data to demonstrate the interface design.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search journal entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={selectedTag || ""}
            onChange={(e) => setSelectedTag(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          <button
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {journalEntries.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Entries</div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-blue-600">7</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">This Week</div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-green-600">21</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(journalEntries.reduce((acc, entry) => acc + entry.content.length, 0) / journalEntries.length)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Words</div>
        </div>
      </div>

      {/* Journal Entries */}
      <div className={viewMode === "grid" 
        ? "grid grid-cols-1 md:grid-cols-2 gap-6" 
        : "space-y-4"
      }>
        {filteredEntries.map((entry) => (
          <div key={entry.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <span className="text-xl mr-2">{getMoodEmoji(entry.mood)}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {entry.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(entry.date)}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-4">
              {entry.content}
            </p>

            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No journal entries found matching your criteria.
          </p>
        </div>
      )}
    </div>
  );
}
