import React from 'react';
import { Flame, Trophy, BookOpen, PenTool, CheckCircle, Smile, Sparkles, Calendar } from 'lucide-react';
import { StreakStats } from '../types';

interface StreakTrackerProps {
  stats: StreakStats;
  onStartReflection: () => void;
}

export const StreakTracker: React.FC<StreakTrackerProps> = ({
  stats,
  onStartReflection,
}) => {
  // Generate past 30 days matrix
  const past30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];
    const isToday = i === 29;
    const isCompleted = stats.activeDates.includes(dateStr);
    return {
      date: d,
      dateStr,
      dayNumber: d.getDate(),
      dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      isToday,
      isCompleted,
    };
  });

  const moodCountsArray = Object.values(stats.moodCounts) as number[];
  const moodTotal = moodCountsArray.reduce((acc: number, val: number) => acc + val, 0) || 1;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pt-2 sm:pt-4">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Streak */}
        <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800 shadow-md flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-500/15 text-orange-400 shrink-0 border border-orange-500/30">
            <Flame className="w-6 h-6 animate-pulse text-orange-400" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Current Streak
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-stone-100 font-serif">{stats.currentStreak}</span>
              <span className="text-xs text-stone-400 font-medium">days</span>
            </div>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800 shadow-md flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 shrink-0 border border-amber-500/30">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Best Streak
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-stone-100 font-serif">{stats.longestStreak}</span>
              <span className="text-xs text-stone-400 font-medium">days</span>
            </div>
          </div>
        </div>

        {/* Total Entries */}
        <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800 shadow-md flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0 border border-indigo-500/30">
            <BookOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Total Entries
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-stone-100 font-serif">{stats.totalEntries}</span>
              <span className="text-xs text-stone-400 font-medium">reflections</span>
            </div>
          </div>
        </div>

        {/* Total Words */}
        <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800 shadow-md flex items-center gap-4">
          <div className="p-3 rounded-xl bg-teal-500/15 text-teal-400 shrink-0 border border-teal-500/30">
            <PenTool className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Words Written
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-stone-100 font-serif">
                {stats.totalWords.toLocaleString()}
              </span>
              <span className="text-xs text-stone-400 font-medium">words</span>
            </div>
          </div>
        </div>
      </div>

      {/* 30-Day Activity Calendar Grid */}
      <div className="bg-stone-900 rounded-2xl p-6 sm:p-7 border border-stone-800 shadow-md space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-stone-800/80">
          <div className="space-y-1">
            <h3 className="font-extrabold text-stone-100 text-base sm:text-lg flex items-center gap-2 font-serif">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>30-Day Reflection Consistency</span>
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed max-w-xl">
              Each highlighted square represents a day you engaged in mindful journaling.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-stone-800 border border-stone-700 inline-block" />
              <span>Rest day</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-amber-500 shadow-xs inline-block" />
              <span className="text-amber-300 font-semibold">Journaled</span>
            </span>
          </div>
        </div>

        {/* Responsive Calendar Heatmap Grid (5 cols mobile, 10 cols tablet/desktop) */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-2.5 pt-1">
          {past30Days.map((item) => (
            <div
              key={item.dateStr}
              title={`${item.dateStr}: ${item.isCompleted ? 'Journaled' : 'No reflection'}`}
              className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                item.isCompleted
                  ? 'bg-amber-500 border-amber-400 text-stone-950 font-bold shadow-md'
                  : 'bg-stone-800/70 border-stone-800 text-stone-400 hover:bg-stone-800 hover:border-stone-700'
              } ${item.isToday ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-stone-900' : ''}`}
            >
              <span className={`text-[10px] uppercase font-extrabold ${item.isCompleted ? 'text-stone-900' : 'text-stone-400'}`}>
                {item.dayName}
              </span>
              <span className="text-sm font-extrabold mt-0.5">{item.dayNumber}</span>
              {item.isCompleted ? (
                <CheckCircle className="w-3.5 h-3.5 mt-1 text-stone-950 stroke-[2.5]" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-stone-600 mt-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mood Distribution Breakdown & Milestone Habit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800 shadow-md space-y-4">
          <h3 className="font-extrabold text-stone-100 text-base flex items-center gap-2 font-serif">
            <Smile className="w-4 h-4 text-amber-400" />
            <span>Emotional & Mood Distribution</span>
          </h3>

          <div className="space-y-3 pt-1">
            {Object.keys(stats.moodCounts).length === 0 ? (
              <p className="text-xs text-stone-400 py-4">No mood data recorded yet.</p>
            ) : (
              Object.entries(stats.moodCounts).map(([emoji, count]) => {
                const numericCount = typeof count === 'number' ? count : Number(count);
                const percentage = Math.round((numericCount / moodTotal) * 100);
                return (
                  <div key={emoji} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-300">
                      <span className="flex items-center gap-2">
                        <span className="text-base">{emoji}</span>
                        <span>{numericCount} {numericCount === 1 ? 'entry' : 'entries'}</span>
                      </span>
                      <span className="text-amber-300 font-bold">{percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700/50">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Consistency Milestone Prompt */}
        <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 rounded-2xl p-6 border border-amber-500/20 text-stone-100 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Mindful Reflection Habit</span>
            </div>
            <h4 className="text-lg font-bold text-stone-100 font-serif">Building Clarity, One Day at a Time</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Consistent journaling helps regulate nervous system activity, clarify decision-making, and reveal unconscious behavioral patterns. Even a 2-minute voice note keeps your streak alive!
            </p>
          </div>

          <button
            type="button"
            onClick={onStartReflection}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs transition-all shadow-md text-center hover:shadow-amber-500/20 active:translate-y-0 hover:-translate-y-0.5"
          >
            Record Today's Reflection &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

