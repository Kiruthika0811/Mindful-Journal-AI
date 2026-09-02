import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Download,
  TrendingUp,
  Award,
  HelpCircle,
  Compass,
  Clock,
  RefreshCw,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import { JournalEntry, WeeklyDigest } from '../types';
import { saveWeeklyDigest } from '../lib/firestoreService';
import { exportDigestToPdf } from '../lib/exportUtils';

interface WeeklyDigestViewProps {
  userId: string;
  entries: JournalEntry[];
  digests: WeeklyDigest[];
}

export const WeeklyDigestView: React.FC<WeeklyDigestViewProps> = ({
  userId,
  entries,
  digests,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedDigestId, setSelectedDigestId] = useState<string | null>(
    digests.length > 0 ? digests[0].id : null
  );

  const activeDigest = digests.find((d) => d.id === selectedDigestId) || digests[0] || null;

  // Manual / Scheduler trigger for Weekly Digest
  const handleGenerateDigest = async () => {
    if (entries.length === 0) {
      setGenerationError('Please write at least one journal reflection before generating a weekly digest.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const startStr = sevenDaysAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Filter recent entries or take last 10
    const relevantEntries = entries.slice(0, 15);

    try {
      const res = await fetch('/api/weekly-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: relevantEntries,
          startDate: startStr,
          endDate: endStr,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const digestData = await res.json();
      const newDigest: WeeklyDigest = {
        id: `digest-${Date.now()}`,
        userId,
        weekRange: digestData.weekRange || `${startStr} - ${endStr}`,
        startDate: startStr,
        endDate: endStr,
        headline: digestData.headline || 'Weekly Growth & Reflection Digest',
        overview: digestData.overview || '',
        topThemes: Array.isArray(digestData.topThemes) ? digestData.topThemes : [],
        moodTrends: digestData.moodTrends || '',
        celebrations: Array.isArray(digestData.celebrations) ? digestData.celebrations : [],
        mindfulInquiryForNextWeek: Array.isArray(digestData.mindfulInquiryForNextWeek)
          ? digestData.mindfulInquiryForNextWeek
          : [],
        recommendedFocus: digestData.recommendedFocus || '',
        entriesAnalyzedCount: relevantEntries.length,
        generatedAt: new Date().toISOString(),
        modelUsed: digestData.modelUsed,
      };

      await saveWeeklyDigest(newDigest);
      setSelectedDigestId(newDigest.id);
    } catch (err: any) {
      console.error('Failed to generate weekly digest:', err);
      setGenerationError(err?.message || 'Failed to generate weekly AI digest.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pt-2 sm:pt-4">
      {/* Top Banner & Generation Trigger */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-7 text-stone-100 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Gemini 3.7 Flash Synthesis Intelligence</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-serif text-stone-100">Weekly AI Reflection Digest</h2>
          <p className="text-xs sm:text-sm text-stone-400 max-w-xl leading-relaxed">
            Synthesizes your multi-turn entries, mood patterns, and reflections across the week into actionable insights and celebration milestones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="generate-weekly-digest-btn"
            type="button"
            disabled={isGenerating || entries.length === 0}
            onClick={handleGenerateDigest}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs transition-all shadow-md disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing Entries...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Generate Weekly Digest</span>
              </>
            )}
          </button>
        </div>
      </div>

      {generationError && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center justify-between">
          <span>{generationError}</span>
          <button type="button" onClick={() => setGenerationError(null)} className="font-bold text-lg">
            ×
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {digests.length === 0 && !activeDigest ? (
        <div className="bg-stone-900 rounded-2xl p-12 text-center border border-stone-800 shadow-md space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <TrendingUp className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-stone-100 text-lg font-serif">No Weekly Digests Generated Yet</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
            In production, a Cloud Scheduler job triggers this digest automatically every Sunday. You can also generate your first digest immediately based on your recorded reflections.
          </p>
          <button
            type="button"
            disabled={isGenerating || entries.length === 0}
            onClick={handleGenerateDigest}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>Generate Digest Now ({entries.length} reflections available)</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Previous Digests Timeline */}
          <div className="lg:col-span-4 bg-stone-900 rounded-2xl border border-stone-800 shadow-md p-5 space-y-4">
            <h3 className="font-bold text-stone-100 text-sm flex items-center gap-2 font-serif">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Digest Archives ({digests.length})</span>
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {digests.map((d) => {
                const isSelected = activeDigest?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDigestId(d.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/40 shadow-xs'
                        : 'bg-stone-800/60 border-stone-800 hover:bg-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-stone-100 mb-1">
                      <span>{d.weekRange}</span>
                      <span className="text-[10px] text-stone-400 font-normal">
                        {new Date(d.generatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 line-clamp-1 italic font-serif">"{d.headline}"</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-amber-300 font-semibold">
                      <span>{d.entriesAnalyzedCount} entries analyzed</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Digest Presentation */}
          {activeDigest && (
            <div className="lg:col-span-8 bg-stone-900 rounded-2xl border border-stone-800 shadow-md p-6 space-y-6">
              {/* Digest Top Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-800">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {activeDigest.weekRange}
                  </span>
                  <h3 className="text-xl font-extrabold text-stone-100 mt-0.5 font-serif">
                    "{activeDigest.headline}"
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => exportDigestToPdf(activeDigest)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-semibold border border-stone-700 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>
              </div>

              {/* Synthesis & Overview */}
              <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-750 space-y-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  Weekly Synthesis
                </span>
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                  {activeDigest.overview}
                </p>
              </div>

              {/* Top Themes & Emotional Trajectory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Top Themes</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeDigest.topThemes.map((theme, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-stone-900 border border-amber-500/30 text-amber-300 text-xs font-semibold"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                    <BarChart3 className="w-4 h-4 text-teal-400" />
                    <span>Mood Trajectory</span>
                  </div>
                  <p className="text-xs text-teal-200 leading-relaxed">
                    {activeDigest.moodTrends || 'Balanced emotional awareness and growth.'}
                  </p>
                </div>
              </div>

              {/* Celebrations & Highlights */}
              {activeDigest.celebrations && activeDigest.celebrations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Milestones & Celebrations</span>
                  </span>
                  <div className="space-y-1.5">
                    {activeDigest.celebrations.map((cel, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-stone-200 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{cel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mindful Inquiry for Next Week */}
              {activeDigest.mindfulInquiryForNextWeek && activeDigest.mindfulInquiryForNextWeek.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span>Mindful Inquiry For The Coming Week</span>
                  </span>
                  <div className="space-y-1.5">
                    {activeDigest.mindfulInquiryForNextWeek.map((inq, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-stone-200 bg-stone-800 border border-stone-700 p-2.5 rounded-lg italic font-medium"
                      >
                        <span className="font-bold text-amber-400 text-sm leading-none shrink-0 mt-0.5">?</span>
                        <span>"{inq}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Focus Banner */}
              {activeDigest.recommendedFocus && (
                <div className="p-4 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500 text-stone-950 shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Recommended Focus
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-stone-200 mt-0.5">
                      {activeDigest.recommendedFocus}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

