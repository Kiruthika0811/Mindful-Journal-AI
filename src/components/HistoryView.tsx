import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Filter,
  Trash2,
  Edit3,
  Download,
  BookOpen,
  Sparkles,
  MessageSquare,
  Clock,
  ChevronRight,
  Smile,
  Tag as TagIcon,
  X,
} from 'lucide-react';
import { JournalEntry, MoodType, FilterOptions } from '../types';
import { deleteJournalEntry } from '../lib/firestoreService';
import { ExportModal } from './ExportModal';
import { generateEntryMarkdown, downloadMarkdownFile, exportEntryToPdf } from '../lib/exportUtils';

interface HistoryViewProps {
  userId: string;
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  userId,
  entries,
  onSelectEntry,
  onNewEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [selectedForExport, setSelectedForExport] = useState<JournalEntry | null>(null);
  const [isExportAllOpen, setIsExportAllOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Collect all unique tags
  const allUniqueTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      e.tags?.forEach((t) => set.add(t.toLowerCase()));
    });
    return Array.from(set);
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Search text match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = entry.title.toLowerCase().includes(q);
        const inContent = entry.content.toLowerCase().includes(q);
        const inSummary = (entry.summary || '').toLowerCase().includes(q);
        const inTags = entry.tags?.some((t) => t.toLowerCase().includes(q));
        const inMessages = entry.messages?.some((m) => m.content.toLowerCase().includes(q));
        if (!inTitle && !inContent && !inSummary && !inTags && !inMessages) {
          return false;
        }
      }

      // Mood match
      if (selectedMood !== 'all' && entry.mood !== selectedMood) {
        return false;
      }

      // Tag match
      if (selectedTag !== 'all' && !entry.tags?.includes(selectedTag)) {
        return false;
      }

      // Date match
      if (dateFilter !== 'all') {
        const entryDate = new Date(entry.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - entryDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (dateFilter === 'today' && diffDays > 1) return false;
        if (dateFilter === '7days' && diffDays > 7) return false;
        if (dateFilter === '30days' && diffDays > 30) return false;
      }

      return true;
    });
  }, [entries, searchQuery, selectedMood, selectedTag, dateFilter]);

  const handleRequestDelete = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    setConfirmDeleteId(entryId);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const entryId = confirmDeleteId;
    setDeletingId(entryId);
    try {
      await deleteJournalEntry(userId, entryId);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete entry:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleQuickExport = (e: React.MouseEvent, entry: JournalEntry) => {
    e.stopPropagation();
    setSelectedForExport(entry);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pt-2 sm:pt-4">
      {/* Header & Controls */}
      <div className="bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-800 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-100 font-serif">Journal History & Search</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Showing {filteredEntries.length} of {entries.length} reflections securely stored in Firestore
            </p>
          </div>

          <div className="flex items-center gap-2">
            {filteredEntries.length > 0 && (
              <button
                id="export-filtered-btn"
                type="button"
                onClick={() => setIsExportAllOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-semibold border border-stone-700 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export All ({filteredEntries.length})</span>
              </button>
            )}

            <button
              id="new-entry-history-btn"
              type="button"
              onClick={onNewEntry}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold shadow-md transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Write Reflection</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Date Filter Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="history-search-input"
              type="text"
              placeholder="Search by keywords, insights, takeaways, questions, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="md:col-span-4 flex items-center gap-1 bg-stone-800 p-1 rounded-xl border border-stone-700">
            {(['all', 'today', '7days', '30days'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDateFilter(mode)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateFilter === mode
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {mode === 'all' && 'All Time'}
                {mode === 'today' && 'Today'}
                {mode === '7days' && '7 Days'}
                {mode === '30days' && '30 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Mood Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 border-t border-stone-800">
          <span className="text-xs font-semibold text-stone-400 shrink-0 mr-1 flex items-center gap-1">
            <Smile className="w-3.5 h-3.5 text-amber-400" /> Mood:
          </span>
          <button
            type="button"
            onClick={() => setSelectedMood('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
              selectedMood === 'all'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
            }`}
          >
            All Moods
          </button>
          {[
            { id: 'grateful', emoji: '😊', label: 'Grateful' },
            { id: 'peaceful', emoji: '🧘', label: 'Peaceful' },
            { id: 'energetic', emoji: '⚡', label: 'Energetic' },
            { id: 'reflective', emoji: '🤔', label: 'Reflective' },
            { id: 'inspired', emoji: '💡', label: 'Inspired' },
            { id: 'stressed', emoji: '😔', label: 'Stressed' },
            { id: 'down', emoji: '🌧️', label: 'Down' },
            { id: 'neutral', emoji: '😐', label: 'Neutral' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMood(m.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1 ${
                selectedMood === m.id
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
              }`}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Tag Filters */}
        {allUniqueTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
            <span className="text-xs font-semibold text-stone-400 shrink-0 mr-1 flex items-center gap-1">
              <TagIcon className="w-3.5 h-3.5 text-amber-400" /> Tags:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTag('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all shrink-0 ${
                selectedTag === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700 border border-stone-700'
              }`}
            >
              #all
            </button>
            {allUniqueTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all shrink-0 ${
                  selectedTag === tag
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700 border border-stone-700'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-stone-900 rounded-2xl p-12 text-center border border-stone-800 shadow-md space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-stone-100 text-base font-serif">No Reflections Found</h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            {entries.length === 0
              ? 'You haven’t recorded any journal reflections yet. Click below to start your first reflection.'
              : 'No entries match your current search and filter criteria. Try clearing some filters.'}
          </p>
          <button
            type="button"
            onClick={onNewEntry}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold shadow-md"
          >
            <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create First Entry</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => {
            const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = new Date(entry.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className="bg-stone-900 rounded-2xl p-5 border border-stone-800 hover:border-amber-500/60 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Mood & Date */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-800 border border-stone-700 text-stone-200">
                      <span>{entry.moodEmoji}</span>
                      <span className="capitalize">{entry.mood}</span>
                    </span>

                    <div className="flex items-center gap-1 text-[11px] text-stone-400 font-medium">
                      <Clock className="w-3 h-3 text-stone-500" />
                      <span>{formattedDate} • {formattedTime}</span>
                    </div>
                  </div>

                  {/* Title & Preview */}
                  <div>
                    <h3 className="font-bold text-stone-100 text-base group-hover:text-amber-300 transition-colors line-clamp-1 font-serif">
                      {entry.title}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-3 leading-relaxed">
                      {entry.content || '(Voice or chat-only reflection)'}
                    </p>
                  </div>

                  {/* AI Summary Highlight */}
                  {entry.summary && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-stone-300">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>AI Insight</span>
                      </div>
                      <p className="line-clamp-2 text-[11px] text-stone-300 leading-relaxed">{entry.summary}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {entry.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded bg-stone-800 text-stone-400 text-[10px] font-medium border border-stone-750"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-800/80 text-xs text-stone-400">
                  <div className="flex items-center gap-3">
                    <span>{entry.wordCount} words</span>
                    {entry.messages && entry.messages.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <MessageSquare className="w-3 h-3" />
                        <span>{entry.messages.length} replies</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Export entry"
                      onClick={(e) => handleQuickExport(e, entry)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      title="Delete entry"
                      disabled={deletingId === entry.id}
                      onClick={(e) => handleRequestDelete(e, entry.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform ml-1">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 rounded-2xl p-6 max-w-sm w-full border border-stone-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100 font-serif">Delete Journal Entry?</h3>
              <p className="text-xs text-stone-400 mt-1">
                This will permanently delete this reflection and all associated AI conversation threads from your Firestore database.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={!!deletingId}
                onClick={() => setConfirmDeleteId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!deletingId}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-sm flex items-center gap-1.5"
              >
                {deletingId ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modals */}
      <ExportModal
        isOpen={!!selectedForExport}
        onClose={() => setSelectedForExport(null)}
        entry={selectedForExport}
      />

      <ExportModal
        isOpen={isExportAllOpen}
        onClose={() => setIsExportAllOpen(false)}
        allEntries={filteredEntries}
      />
    </div>
  );
};

