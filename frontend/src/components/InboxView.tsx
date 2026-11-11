import React, { useState } from 'react';
import { 
  Inbox as InboxIcon, Trash2, ArrowUpRight, Search, Sparkles, RefreshCw, RotateCcw, AlertCircle, CheckCircle2, FileText, CheckSquare
} from 'lucide-react';
import { AreaHierarchy, Capture } from '../types';
import { useCaptures, PromoteCaptureOptions } from '../hooks/useCaptures';
import PromoteCaptureModal from './PromoteCaptureModal';

interface InboxViewProps {
  hierarchy?: AreaHierarchy[];
  onPromoteSuccess?: () => void;
}

export default function InboxView({
  hierarchy = [],
  onPromoteSuccess,
}: InboxViewProps) {
  const {
    captures,
    trashedCaptures,
    isLoading,
    error,
    promoteCapture,
    trashCapture,
    restoreCapture,
    deletePermanent,
    refreshCaptures,
    fetchTrashed,
  } = useCaptures();

  const [activeTab, setActiveTab] = useState<'INBOX' | 'TRASH'>('INBOX');
  const [filterType, setFilterType] = useState<'ALL' | 'TASK' | 'NOTE' | 'HABIT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaptureToPromote, setSelectedCaptureToPromote] = useState<Capture | null>(null);

  const handleTabSwitch = (tab: 'INBOX' | 'TRASH') => {
    setActiveTab(tab);
    if (tab === 'TRASH') {
      fetchTrashed();
    } else {
      refreshCaptures();
    }
  };

  const currentList = activeTab === 'INBOX' ? captures : trashedCaptures;

  const filteredCaptures = currentList.filter((item) => {
    const matchesType = filterType === 'ALL' || item.type === filterType;
    const matchesSearch =
      item.rawContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.smartSummary && item.smartSummary.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handlePromote = async (id: string, options: PromoteCaptureOptions) => {
    await promoteCapture(id, options);
    if (onPromoteSuccess) {
      onPromoteSuccess();
    }
  };

  return (
    <div id="tour-inbox-view" className="w-full max-w-[1440px] mx-auto animate-fade-in relative p-6 md:p-8 rounded-[32px] overflow-hidden border border-border/40 shadow-sm">
      {/* Background Gradient */}
      <div 
        className="absolute inset-0 -z-10 bg-gradient-to-t from-surface/95 via-surface/80 to-surface/35 backdrop-blur-md pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 70%, rgba(0,0,0,0.5) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 70%, rgba(0,0,0,0.5) 100%)'
        }}
      />

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-headline font-bold text-textPrimary flex items-center gap-2">
              <InboxIcon className="text-accent" size={24} />
              <span>Capture Inbox</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-surfaceSecondary border border-border text-textSecondary">
              {captures.length} unprocessed
            </span>
          </div>
          <p className="text-xs text-textSecondary mt-0.5">
            Your frictionless holding space. Triage and promote into Tasks, Notes, or Habits when you have time.
          </p>
        </div>

        {/* View mode toggle (Active Inbox vs Trash) */}
        <div className="flex items-center gap-2">
          <div className="bg-surfaceSecondary p-1 rounded-full border border-border flex items-center text-xs">
            <button
              onClick={() => handleTabSwitch('INBOX')}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                activeTab === 'INBOX'
                  ? 'bg-surface text-textPrimary shadow-sm'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Active Queue ({captures.length})
            </button>
            <button
              onClick={() => handleTabSwitch('TRASH')}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                activeTab === 'TRASH'
                  ? 'bg-surface text-textPrimary shadow-sm'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Trash
            </button>
          </div>

          <button
            onClick={() => refreshCaptures()}
            className="p-2 rounded-full hover:bg-surfaceSecondary text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
            title="Refresh inbox"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {(['ALL', 'TASK', 'NOTE', 'HABIT'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                filterType === type
                  ? 'bg-pill-active text-pill-active-text shadow-sm'
                  : 'bg-pill text-textSecondary hover:text-textPrimary'
              }`}
            >
              {type === 'ALL' ? 'All Captures' : `${type.charAt(0) + type.slice(1).toLowerCase()}s`}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-textSecondary">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search captures..."
            className="w-full bg-surface border border-border text-xs pl-9 pr-3 py-2 rounded-full placeholder:text-textMuted text-textPrimary outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Captures Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-6 h-6 border-2 border-textSecondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredCaptures.length === 0 ? (
        <section className="w-full min-h-[350px] bg-surface border border-border rounded-[28px] canvas-shadow p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="max-w-md relative z-10 flex flex-col items-center">
            <div className="mb-4 inline-flex p-4 rounded-full bg-surfaceSecondary text-textPrimary border border-border">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-headline font-bold text-textPrimary mb-2">
              {activeTab === 'TRASH'
                ? 'Trash is empty'
                : searchQuery
                ? 'No matching captures found'
                : 'Mind is Clear'}
            </h3>
            <p className="text-xs md:text-sm text-textSecondary leading-relaxed">
              {activeTab === 'TRASH'
                ? 'Discarded captures will appear here if you need to recover them.'
                : searchQuery
                ? 'Try adjusting your search keywords or filter selection.'
                : 'Everything you have captured has been organized or filed. Capture your next thought below.'}
            </p>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCaptures.map((capture) => (
            <div
              key={capture.id}
              className="group bg-surface border border-border hover:border-textSecondary/40 rounded-[24px] p-5 canvas-shadow hover:shadow-lg transition-all duration-200 relative flex flex-col justify-between min-h-[170px]"
            >
              <div>
                {/* Header: Type Badge & Date */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        capture.type === 'TASK'
                          ? 'bg-[#ffdad6] dark:bg-red-950/40 text-[#ba1a1a] dark:text-red-200'
                          : capture.type === 'NOTE'
                          ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200'
                          : 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200'
                      }`}
                    >
                      {capture.type === 'TASK' && <CheckSquare size={10} />}
                      {capture.type === 'NOTE' && <FileText size={10} />}
                      {capture.type === 'HABIT' && <CheckCircle2 size={10} />}
                      <span>{capture.type}</span>
                    </span>

                    <span className="text-[10px] text-textSecondary font-mono">
                      {new Date(capture.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Actions (Promote / Trash) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activeTab === 'INBOX' ? (
                      <>
                        <button
                          onClick={() => setSelectedCaptureToPromote(capture)}
                          className="px-2 py-1 rounded-lg bg-accent text-accent-text text-xs font-semibold flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                          title="Promote to first-class entity"
                        >
                          <ArrowUpRight size={13} />
                          <span>Promote</span>
                        </button>
                        <button
                          onClick={() => trashCapture(capture.id)}
                          className="p-1.5 hover:bg-red-500/10 text-textSecondary hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                          title="Move to trash"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => restoreCapture(capture.id)}
                          className="px-2 py-1 rounded-lg bg-surfaceSecondary border border-border text-xs font-semibold text-textPrimary hover:bg-surface flex items-center gap-1 cursor-pointer"
                          title="Restore to inbox"
                        >
                          <RotateCcw size={12} />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => deletePermanent(capture.id)}
                          className="p-1.5 hover:bg-red-500/10 text-textSecondary hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                          title="Delete permanently"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* AI Smart Summary if present */}
                {capture.smartSummary && (
                  <div className="flex items-center gap-1.5 mb-2.5 text-xs font-medium text-textPrimary bg-surfaceSecondary border border-border rounded-lg px-2.5 py-1 w-fit">
                    <Sparkles size={13} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
                    <span className="line-clamp-1">{capture.smartSummary}</span>
                  </div>
                )}

                {/* Raw Content */}
                <p className="text-xs md:text-sm text-textPrimary leading-relaxed whitespace-pre-line mb-3 font-sans">
                  {capture.rawContent}
                </p>
              </div>

              {/* Bottom Quick Triage button */}
              {activeTab === 'INBOX' && (
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-textSecondary">Unprocessed</span>
                  <button
                    onClick={() => setSelectedCaptureToPromote(capture)}
                    className="text-xs text-accent font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Organize</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Promotion Modal */}
      {selectedCaptureToPromote && (
        <PromoteCaptureModal
          capture={selectedCaptureToPromote}
          hierarchy={hierarchy}
          onPromote={handlePromote}
          onClose={() => setSelectedCaptureToPromote(null)}
        />
      )}
    </div>
  );
}
