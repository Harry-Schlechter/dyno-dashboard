import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Settings, Eye, EyeOff, Plus } from "lucide-react";
import { supabase, getCurrentUserId, PageConfig } from "../lib/supabase";

export function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [pageConfig, setPageConfig] = useState<PageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPageConfig(slug);
    }
  }, [slug]);

  const fetchPageConfig = async (pageSlug: string) => {
    try {
      const userId = getCurrentUserId();
      
      const { data, error } = await supabase
        .from("page_configs")
        .select("*")
        .eq("user_id", userId)
        .eq("slug", pageSlug)
        .eq("is_enabled", true)
        .single();

      if (error) {
        console.error("Error fetching page config:", error);
        // For demo, show a placeholder page
        setPageConfig({
          id: "demo-page",
          user_id: userId,
          name: `Custom Page: ${pageSlug}`,
          slug: pageSlug,
          config: {
            layout: "grid",
            widgets: [
              {
                type: "metric",
                title: "Sample Metric",
                value: "42",
                description: "This is a demo widget"
              }
            ]
          },
          is_enabled: true,
          order_index: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        setPageConfig(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderWidget = (widget: any, index: number) => {
    switch (widget.type) {
      case "metric":
        return (
          <div key={index} className="metric-card">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {widget.value}
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {widget.title}
            </div>
            {widget.description && (
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {widget.description}
              </div>
            )}
          </div>
        );
      
      case "chart":
        return (
          <div key={index} className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {widget.title}
            </h3>
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">
                Chart placeholder - {widget.chartType || "line"}
              </span>
            </div>
          </div>
        );
      
      case "text":
        return (
          <div key={index} className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {widget.title}
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              {widget.content}
            </p>
          </div>
        );
      
      case "list":
        return (
          <div key={index} className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {widget.title}
            </h3>
            <ul className="space-y-2">
              {(widget.items || []).map((item: string, itemIndex: number) => (
                <li key={itemIndex} className="flex items-center text-gray-700 dark:text-gray-300">
                  <span className="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      
      default:
        return (
          <div key={index} className="card">
            <div className="text-center text-gray-500 dark:text-gray-400">
              Unknown widget type: {widget.type}
            </div>
          </div>
        );
    }
  };

  const renderPlaceholderPage = () => (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Dynamic Page System</h1>
        <p className="page-subtitle">
          Configurable pages powered by Supabase
        </p>
      </div>

      {/* Feature Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <Settings className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
              Dynamic Page System
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              This system allows creating custom dashboard pages with configurable widgets. Page configurations are stored in Supabase and can be managed through the admin interface.
            </p>
          </div>
        </div>
      </div>

      {/* Sample Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="metric-card">
          <div className="text-3xl font-bold text-primary-600">127</div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Sample Metric</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">+12% from last week</div>
        </div>

        <div className="metric-card">
          <div className="text-3xl font-bold text-green-600">89%</div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">Above target</div>
        </div>

        <div className="metric-card">
          <div className="text-3xl font-bold text-orange-600">5.2k</div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">This month</div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Custom Content Widget
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          This is an example of a custom text widget. You can configure these widgets to show different types of content:
        </p>
        <ul className="space-y-2">
          <li className="flex items-center text-gray-700 dark:text-gray-300">
            <span className="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
            Metrics and KPIs
          </li>
          <li className="flex items-center text-gray-700 dark:text-gray-300">
            <span className="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
            Charts and graphs
          </li>
          <li className="flex items-center text-gray-700 dark:text-gray-300">
            <span className="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
            Text content and lists
          </li>
          <li className="flex items-center text-gray-700 dark:text-gray-300">
            <span className="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
            Custom data visualizations
          </li>
        </ul>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading page...</div>
      </div>
    );
  }

  if (!pageConfig) {
    return renderPlaceholderPage();
  }

  const widgets = pageConfig.config?.widgets || [];
  const layout = pageConfig.config?.layout || "grid";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="page-header">
          <h1 className="page-title">{pageConfig.name}</h1>
          <p className="page-subtitle">
            Custom dashboard page • {widgets.length} widgets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              editMode
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {editMode ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                View Mode
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Edit Mode
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit Mode Notice */}
      {editMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Edit Mode Active
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                In a full implementation, this would allow drag-and-drop widget arrangement, adding new widgets, and configuring widget properties.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Widgets */}
      {widgets.length > 0 ? (
        <div className={
          layout === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-6"
        }>
          {widgets.map((widget, index) => renderWidget(widget, index))}
          
          {editMode && (
            <div className="card border-dashed border-2 border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400 transition-colors cursor-pointer">
              <div className="flex flex-col items-center justify-center py-8">
                <Plus className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Add Widget</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            This page has no widgets configured yet.
          </p>
          {editMode && (
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              Add First Widget
            </button>
          )}
        </div>
      )}
    </div>
  );
}
