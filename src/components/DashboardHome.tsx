import React from 'react';
import {
  BookOpen,
  TrendingUp,
  Flame,
  Sparkles,
  Smile,
  Plus,
  ArrowRight,
  Lightbulb,
  Calendar,
  Compass,
  History,
} from 'lucide-react';
import { FirebaseUser } from '../lib/firebase';
import { JournalEntry, StreakStats } from '../types';

interface DashboardHomeProps {
  user: FirebaseUser;
  entries: JournalEntry[];
  stats: StreakStats;
  onNewReflection: () => void;
  onOpenWeeklyDigest: () => void;
  onNavigateTab: (tab: 'composer' | 'history' | 'digest' | 'streak') => void;
  onSelectEntry: (entry: JournalEntry) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  user,
  entries,
  stats,
  onNewReflection,
  onOpenWeeklyDigest,
  onNavigateTab,
  onSelectEntry,
}) => {
  // Current formatted date
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Display Name resolution: Read full user.displayName without truncating, splitting, or initials.
  // Fall back to email prefix (before @) if displayName is empty/unavailable.
  const emailPrefix = user.email ? user.email.split('@')[0] : '';
  const resolvedDisplayName = (user.displayName && user.displayName.trim().length > 0)
    ? user.displayName.trim()
    : (emailPrefix || 'Friend');

  console.log('[DashboardHome] Firebase Auth User Identity:', {
    displayName: user.displayName,
    email: user.email,
    resolvedDisplayName,
  });

  // 1. Total Entries
  const totalEntriesCount = entries.length;

  // 2. Dominant Mood calculation
  const moodEmojiMap: Record<string, string> = {
    grateful: '😊',
    peaceful: '🧘',
    energetic: '⚡',
    reflective: '🤔',
    inspired: '💡',
    stressed: '😔',
    down: '🌧️',
    neutral: '😐',
  };

  let dominantMoodLabel = 'Reflective';
  let dominantMoodEmoji = '🤔';

  if (entries.length > 0) {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      const m = e.mood || 'reflective';
      counts[m] = (counts[m] || 0) + 1;
    });

    let maxCount = 0;
    let maxMood = 'reflective';
    Object.entries(counts).forEach(([m, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxMood = m;
      }
    });

    dominantMoodLabel = maxMood.charAt(0).toUpperCase() + maxMood.slice(1);
    dominantMoodEmoji = entries.find((e) => e.mood === maxMood)?.moodEmoji || moodEmojiMap[maxMood] || '✨';
  }

  // 3. Realizations / Key Insights Count
  // Count key insights/themes Gemini has extracted across entries, or number of summaries generated
  const realizationsCount = entries.reduce((acc, e) => {
    if (e.summary) {
      const themesCount = Array.isArray(e.themes) && e.themes.length > 0 ? e.themes.length : 1;
      return acc + themesCount;
    }
    return acc;
  }, 0);

  // Recent 3 entries for quick jump
  const recentEntries = entries.slice(0, 3);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 1. Welcome Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 border border-stone-800 p-6 sm:p-8 text-stone-100 shadow-xl">
        {/* Subtle decorative warm ambient glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 rounded-full bg-orange-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{todayFormatted}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-50 font-serif">
              Welcome back, <span className="text-amber-400">{resolvedDisplayName}</span>.
            </h1>

            <p className="text-sm sm:text-base text-stone-300 leading-relaxed font-sans pt-1">
              Take a quiet breath. How is your mind feeling right now?
            </p>
          </div>

          {/* 2. Primary Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              id="dashboard-new-reflection-btn"
              type="button"
              onClick={onNewReflection}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm transition-all shadow-md hover:shadow-amber-500/20 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-4 h-4 text-stone-950 stroke-[2.5]" />
              <span>New Reflection</span>
            </button>

            <button
              id="dashboard-weekly-synthesis-btn"
              type="button"
              onClick={onOpenWeeklyDigest}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-stone-800/90 hover:bg-stone-700/90 border border-stone-700/80 text-stone-100 hover:text-amber-200 font-semibold text-xs sm:text-sm transition-all shadow-sm"
            >
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Weekly Synthesis</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Four Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Entries */}
        <div
          onClick={() => onNavigateTab('history')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-stone-900 border border-stone-800/90 p-5 text-stone-100 hover:border-amber-500/40 hover:bg-stone-850 transition-all duration-200 shadow-md flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 font-sans">
              Total Entries
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-stone-50 font-sans">
                {totalEntriesCount}
              </span>
              <span className="text-xs text-stone-400 font-medium">saved</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1 group-hover:text-amber-300 transition-colors">
              <span>View archive & search</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>

        {/* Card 2: Mindful Streak */}
        <div
          onClick={() => onNavigateTab('streak')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-stone-900 border border-stone-800/90 p-5 text-stone-100 hover:border-orange-500/40 hover:bg-stone-850 transition-all duration-200 shadow-md flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 font-sans">
              Mindful Streak
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-orange-400 font-sans">
                {stats.currentStreak}
              </span>
              <span className="text-xs text-stone-400 font-medium">days active</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1 group-hover:text-orange-300 transition-colors">
              <span>{stats.longestStreak} days best record</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>

        {/* Card 3: Dominant Mood */}
        <div
          onClick={() => onNavigateTab('streak')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-stone-900 border border-stone-800/90 p-5 text-stone-100 hover:border-amber-500/40 hover:bg-stone-850 transition-all duration-200 shadow-md flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 font-sans">
              Dominant Mood
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Smile className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{dominantMoodEmoji}</span>
              <span className="text-xl font-bold text-stone-50 truncate">
                {dominantMoodLabel}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1 group-hover:text-amber-300 transition-colors">
              <span>Recent reflections trend</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>

        {/* Card 4: Realizations */}
        <div
          onClick={() => onNavigateTab('digest')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-stone-900 border border-stone-800/90 p-5 text-stone-100 hover:border-amber-500/40 hover:bg-stone-850 transition-all duration-200 shadow-md flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 font-sans">
              Realizations
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Lightbulb className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-300 font-sans">
                {realizationsCount}
              </span>
              <span className="text-xs text-stone-400 font-medium">insights distilled</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1 group-hover:text-amber-300 transition-colors">
              <span>Synthesized by Gemini AI</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>
      </div>

      {/* 5. Quick Navigation Hub & Recent Reflections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Quick Links / Mindful Path */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800/90 rounded-2xl p-6 text-stone-100 shadow-md space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-sm">Mindful Exploration</h3>
              <p className="text-xs text-stone-400">Navigate your sacred journaling spaces</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => onNavigateTab('composer')}
              className="w-full text-left p-3.5 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/30 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-800 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-200 group-hover:text-amber-300 block">
                    Journal & Chat
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Write, dictate voice notes, and converse with Gemini
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('history')}
              className="w-full text-left p-3.5 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/30 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-800 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-200 group-hover:text-amber-300 block">
                    History & Search
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Browse past entries, search keywords, and export PDF
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('digest')}
              className="w-full text-left p-3.5 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/30 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-800 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-200 group-hover:text-amber-300 block">
                    Weekly AI Synthesis
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Growth digests, milestones, and mindful questions
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Recent Reflections Preview */}
        <div className="lg:col-span-7 bg-stone-900 border border-stone-800/90 rounded-2xl p-6 text-stone-100 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-stone-100 text-sm">Recent Reflections</h3>
                <p className="text-xs text-stone-400">Jump right back into your thoughts</p>
              </div>
            </div>

            {entries.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab('history')}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <span>View All ({entries.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {recentEntries.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-stone-850 border border-stone-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-800 text-amber-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-stone-200">No reflections logged yet</h4>
              <p className="text-xs text-stone-400 max-w-xs mx-auto">
                Begin your journey today by recording your thoughts or starting a guided voice reflection.
              </p>
              <button
                type="button"
                onClick={onNewReflection}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Write First Reflection</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentEntries.map((entry) => {
                const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <div
                    key={entry.id}
                    onClick={() => onSelectEntry(entry)}
                    className="p-3.5 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/30 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="space-y-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{entry.moodEmoji}</span>
                        <h4 className="text-xs font-bold text-stone-200 group-hover:text-amber-300 truncate">
                          {entry.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-stone-400 line-clamp-1">
                        {entry.summary || entry.content || '(Voice/dialogue reflection)'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[11px] text-stone-500">
                      <span>{formattedDate}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-stone-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
