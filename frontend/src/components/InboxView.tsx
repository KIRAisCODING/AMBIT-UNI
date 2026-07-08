import React, { useState } from 'react';
import { 
  Check, Trash2, Calendar, Folder, Tag, Search, Sparkles, Filter 
} from 'lucide-react';
import { BrainItem, ItemType } from '../types';

interface InboxViewProps {
  items: BrainItem[];
  onToggleComplete: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onScheduleItem: (id: string, date: string) => void;
}

export default function InboxView({ 
  items, 
  onToggleComplete, 
  onDeleteItem,
  onScheduleItem
}: InboxViewProps) {
  const [filterType, setFilterType] = useState<ItemType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items that are assigned (assignment === 'now')
  const assignedItems = items.filter(it => it.assignment === 'now');

  const filteredItems = assignedItems.filter(item => {
    const matchesType = filterType === 'All' || item.type === filterType;
    const matchesSearch = item.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.smartSummary && item.smartSummary.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (item.area && item.area.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (item.project && item.project.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="w-full max-w-[1440px] mx-auto animate-fade-in relative p-6 md:p-8 rounded-[32px] overflow-hidden border border-border/40 shadow-sm">
      {/* Frosted glass background that gradients towards the top */}
      <div 
        className="absolute inset-0 -z-10 bg-gradient-to-t from-surface/95 via-surface/80 to-surface/35 backdrop-blur-md pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 70%, rgba(0,0,0,0.5) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 70%, rgba(0,0,0,0.5) 100%)'
        }}
      />
      {/* Header with Search and Filter Chips */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {(['All', 'Task', 'Idea', 'Note', 'Journal'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer h-[31px] flex items-center justify-center ${
                filterType === type
                  ? 'bg-pill-active text-pill-active-text shadow-sm'
                  : 'bg-pill text-textSecondary hover:text-textPrimary hover:opacity-90'
              }`}
            >
              {type === 'All' ? 'All Content' : `${type}s`}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-textSecondary">
            <Search size={20} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your brain..."
            className="w-full bg-surface border border-border focus:ring-1 focus:ring-accent text-sm pl-10 pr-4 py-2 rounded-full placeholder:text-textMuted text-textPrimary outline-none transition-all duration-200"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-textSecondary hover:text-textPrimary"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Content or Empty State */}
      {filteredItems.length === 0 ? (
        <section className="w-full min-h-[55vh] bg-surface border border-border rounded-[28px] canvas-shadow p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div 
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.1] pointer-events-none select-none" 
            style={{ 
              backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', 
              backgroundSize: '40px 40px' 
            }}
          />
          <div className="max-w-md relative z-10 flex flex-col items-center">
            <div className="mb-6 inline-flex p-4 rounded-full bg-surfaceSecondary text-textPrimary border border-border">
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>lightbulb</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-textPrimary mb-3">
              {searchQuery ? "No matching thoughts found" : "Clear Your Mind"}
            </h2>
            <p className="text-sm md:text-base text-textSecondary leading-relaxed">
              {searchQuery 
                ? "Try refining your search query, adjusting your filters, or capturing a new memory."
                : "A distraction-free space for your most important thoughts. Everything you capture here will be organized in your external brain."}
            </p>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div 
              key={item.id}
              className="group bg-surface border border-border hover:border-textSecondary/40 rounded-[24px] p-6 canvas-shadow hover:shadow-lg transition-all duration-300 relative flex flex-col min-h-[180px] justify-between"
            >
              {/* Card Upper Part */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {/* Item Type Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.type === 'Task' ? 'bg-[#ffdad6] dark:bg-red-950/40 text-[#ba1a1a] dark:text-red-200' :
                      item.type === 'Idea' ? 'bg-pill text-textSecondary' :
                      item.type === 'Note' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200' :
                      'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200'
                    }`}>
                      {item.type}
                    </span>
                    {/* Date */}
                    <span className="text-[10px] text-textSecondary font-mono">
                      {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Actions Dropdown / Trash */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.type === 'Task' && (
                      <button
                        onClick={() => onToggleComplete(item.id)}
                        className={`p-1.5 rounded-full transition-colors ${
                          item.completed 
                            ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-200' 
                            : 'hover:bg-surfaceSecondary text-textSecondary'
                        }`}
                        title={item.completed ? "Mark incomplete" : "Mark as completed"}
                      >
                        <Check size={20} />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 text-textSecondary rounded-full transition-colors"
                      title="Delete item"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Gemini AI Smart Summary */}
                {item.smartSummary && (
                  <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-textPrimary bg-surfaceSecondary border border-border rounded-lg px-2.5 py-1 w-fit">
                    <Sparkles size={20} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
                    <span className="line-clamp-1">{item.smartSummary}</span>
                  </div>
                )}

                {/* Main Content Text */}
                <p className={`text-sm md:text-sm text-textPrimary leading-relaxed mb-4 whitespace-pre-line ${
                  item.completed ? 'line-through text-textSecondary/50' : ''
                }`}>
                  {item.content}
                </p>
              </div>

              {/* Card Footer Part */}
              <div className="pt-3 border-t border-border flex flex-col gap-2">
                {/* Area / Project Path */}
                {item.area && (
                  <div className="flex items-center gap-1.5 text-xs text-textSecondary font-medium">
                    <Folder size={20} className="shrink-0 text-textSecondary/70" />
                    <span className="hover:text-textPrimary cursor-pointer">{item.area}</span>
                    {item.project && (
                      <>
                        <span className="text-textSecondary/40">/</span>
                        <span className="hover:text-textPrimary cursor-pointer">{item.project}</span>
                      </>
                    )}
                    {item.subProject && (
                      <>
                        <span className="text-textSecondary/40">/</span>
                        <span className="font-mono text-[10px] hover:text-textPrimary cursor-pointer">{item.subProject}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span 
                        key={tag}
                        className="inline-flex items-center text-[10px] font-medium bg-pill text-textSecondary px-2 py-0.5 rounded transition-colors hover:opacity-80"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Calendar Schedule Input (Interactive scheduling!) */}
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={20} className="text-textSecondary/70" />
                  <input
                    type="date"
                    value={item.scheduledDate || ''}
                    onChange={(e) => onScheduleItem(item.id, e.target.value)}
                    className="bg-transparent border-none text-[10px] text-textSecondary hover:text-textPrimary p-0 focus:ring-0 outline-none w-fit cursor-pointer font-medium"
                    title="Schedule for calendar"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
