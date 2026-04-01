import React, { useState } from "react";
import { Brain, Search, Calendar, User, MapPin, Lightbulb, Heart } from "lucide-react";

interface MemoryNode {
  id: string;
  type: "person" | "place" | "event" | "skill" | "preference";
  title: string;
  description: string;
  connections: string[];
  strength: number;
  lastAccessed: string;
  tags: string[];
}

export function Memory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<MemoryNode | null>(null);

  // Mock memory data - in production, this would come from the AI memory system
  const memoryNodes: MemoryNode[] = [
    {
      id: "1",
      type: "person",
      title: "Sydney Gilmore",
      description: "Girlfriend, 2nd year med student at Albert Einstein. Boulders V5. Planning summer 2028 wedding.",
      connections: ["wedding-planning", "climbing", "apartment"],
      strength: 100,
      lastAccessed: "2026-03-31",
      tags: ["relationship", "climbing", "medical-school"]
    },
    {
      id: "2", 
      type: "place",
      title: "Central Park Boulders",
      description: "Favorite climbing spot in NYC. Good for V2-V4 problems. Usually go with Sydney on weekends.",
      connections: ["sydney", "climbing-training", "weekend-routine"],
      strength: 85,
      lastAccessed: "2026-03-30",
      tags: ["climbing", "recreation", "nyc"]
    },
    {
      id: "3",
      type: "skill",
      title: "React TypeScript Development",
      description: "Primary tech stack at Trinity. Working on authentication refactor. Strong preference for functional components.",
      connections: ["trinity-work", "side-projects", "career-growth"],
      strength: 95,
      lastAccessed: "2026-03-31",
      tags: ["programming", "work", "expertise"]
    },
    {
      id: "4",
      type: "preference",
      title: "Morning Workout Schedule",
      description: "Prefers lifting on WFH days in the morning. PPL split. Basketball 3-4x per week evenings.",
      connections: ["fitness-routine", "work-schedule", "energy-levels"],
      strength: 90,
      lastAccessed: "2026-03-29",
      tags: ["fitness", "routine", "schedule"]
    },
    {
      id: "5",
      type: "event",
      title: "Trinity Promotion to SWE IV",
      description: "Promoted March 24, 2026 to Senior Software Design Engineer. $154k base + 10% bonus.",
      connections: ["career-growth", "financial-planning", "confidence"],
      strength: 88,
      lastAccessed: "2026-03-25",
      tags: ["career", "achievement", "milestone"]
    }
  ];

  const memoryTypes = [
    { value: "person", label: "People", icon: User, color: "bg-blue-100 text-blue-800" },
    { value: "place", label: "Places", icon: MapPin, color: "bg-green-100 text-green-800" },
    { value: "event", label: "Events", icon: Calendar, color: "bg-purple-100 text-purple-800" },
    { value: "skill", label: "Skills", icon: Lightbulb, color: "bg-orange-100 text-orange-800" },
    { value: "preference", label: "Preferences", icon: Heart, color: "bg-pink-100 text-pink-800" },
  ];

  const filteredMemories = memoryNodes.filter(memory => {
    const matchesSearch = searchTerm === "" || 
      memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memory.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memory.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === null || memory.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const getTypeConfig = (type: string) => {
    return memoryTypes.find(t => t.value === type) || memoryTypes[0];
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 90) return "text-green-600";
    if (strength >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">AI Memory System</h1>
        <p className="page-subtitle">
          Visual representation of Dyno's knowledge about Harry's life
        </p>
      </div>

      {/* Placeholder Notice */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <div className="flex items-start">
          <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-purple-900 dark:text-purple-200">
              Memory System Placeholder
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
              This interface will eventually connect to Dyno's actual memory system to visualize learned information, connections, and knowledge strength. Currently showing mock data.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Memory Type Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedType(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedType === null
              ? "bg-primary-600 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          All Types
        </button>
        {memoryTypes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setSelectedType(selectedType === value ? null : value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
              selectedType === value
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Memory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {memoryNodes.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Memories</div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-blue-600">
            {memoryNodes.filter(m => m.strength >= 90).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Strong Memories</div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-green-600">
            {memoryNodes.reduce((acc, m) => acc + m.connections.length, 0)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Connections</div>
        </div>

        <div className="metric-card">
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(memoryNodes.reduce((acc, m) => acc + m.strength, 0) / memoryNodes.length)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Strength</div>
        </div>
      </div>

      {/* Memory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredMemories.map((memory) => {
          const typeConfig = getTypeConfig(memory.type);
          return (
            <div 
              key={memory.id} 
              className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedMemory(memory)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${typeConfig.color.replace("text-", "bg-").replace("800", "100")} mr-3`}>
                    <typeConfig.icon className={`h-5 w-5 ${typeConfig.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {memory.title}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig.color}`}>
                      {typeConfig.label.slice(0, -1)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${getStrengthColor(memory.strength)}`}>
                    {memory.strength}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    strength
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {memory.description}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{memory.connections.length} connections</span>
                <span>Accessed {formatDate(memory.lastAccessed)}</span>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {memory.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
                {memory.tags.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{memory.tags.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredMemories.length === 0 && (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No memories found matching your criteria.
          </p>
        </div>
      )}

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${getTypeConfig(selectedMemory.type).color.replace("text-", "bg-").replace("800", "100")} mr-4`}>
                  <Brain className={`h-6 w-6 ${getTypeConfig(selectedMemory.type).color}`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedMemory.title}
                  </h2>
                  <span className={`text-sm px-3 py-1 rounded-full ${getTypeConfig(selectedMemory.type).color}`}>
                    {getTypeConfig(selectedMemory.type).label.slice(0, -1)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedMemory(null)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                <p className="text-gray-700 dark:text-gray-300">{selectedMemory.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Strength</h3>
                  <div className={`text-2xl font-bold ${getStrengthColor(selectedMemory.strength)}`}>
                    {selectedMemory.strength}%
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Last Accessed</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {formatDate(selectedMemory.lastAccessed)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Connections</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedMemory.connections.map((connection) => (
                    <span
                      key={connection}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200"
                    >
                      {connection}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedMemory.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
