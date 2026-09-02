import React, { useState } from 'react';
import { Sparkles, X, RefreshCw, BookOpen, Check } from 'lucide-react';
import { PromptItem } from '../types';

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (promptText: string) => void;
  currentMood?: string;
}

const DEFAULT_PROMPTS: PromptItem[] = [
  { id: '1', category: 'Gratitude & Wins', prompt: 'What went well today, and what made it special?' },
  { id: '2', category: 'Gratitude & Wins', prompt: 'Who is someone I appreciated today, and why?' },
  { id: '3', category: 'Navigating Challenges', prompt: 'What felt difficult or heavy today, and what did it teach me?' },
  { id: '4', category: 'Navigating Challenges', prompt: 'What is something out of my control that I can practice letting go of?' },
  { id: '5', category: 'Self-Discovery', prompt: 'What thought or emotion has been lingering in the back of my mind today?' },
  { id: '6', category: 'Self-Discovery', prompt: 'In what moment today did I feel most authentic and connected to myself?' },
  { id: '7', category: 'Intention & Tomorrow', prompt: 'What is one meaningful intention or mindset I want to embody tomorrow?' },
  { id: '8', category: 'Intention & Tomorrow', prompt: 'If I could give my future self one gentle reminder tonight, what would it be?' },
];

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
  currentMood,
}) => {
  const [prompts, setPrompts] = useState<PromptItem[]>(DEFAULT_PROMPTS);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isLoadingAiPrompts, setIsLoadingAiPrompts] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = ['All', 'Gratitude & Wins', 'Navigating Challenges', 'Self-Discovery', 'Intention & Tomorrow', 'AI Tailored'];

  const filteredPrompts = activeCategory === 'All'
    ? prompts
    : prompts.filter((p) => p.category.toLowerCase() === activeCategory.toLowerCase());

  const handleFetchAiPrompts = async () => {
    setIsLoadingAiPrompts(true);
    try {
      const response = await fetch('/api/prompt-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recentMoods: currentMood ? [currentMood] : ['reflective'],
          timeOfDay: new Date().getHours() > 17 ? 'evening' : 'morning',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.prompts) && data.prompts.length > 0) {
          const formatted = data.prompts.map((p: any, i: number) => ({
            id: `ai-${Date.now()}-${i}`,
            category: p.category || 'AI Tailored',
            prompt: p.prompt || p,
          }));
          setPrompts((prev) => [...formatted, ...prev]);
          setActiveCategory('AI Tailored');
        }
      }
    } catch (err) {
      console.warn('Could not fetch custom AI prompts:', err);
    } finally {
      setIsLoadingAiPrompts(false);
    }
  };

  const handleSelect = (prompt: PromptItem) => {
    setCopiedId(prompt.id);
    onSelectPrompt(prompt.prompt);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-stone-900 rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-stone-800">
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-lg font-serif">Reflection Prompt Library</h3>
              <p className="text-xs text-stone-400">Select an inspiring prompt to kickstart your journal reflection</p>
            </div>
          </div>
          <button
            id="close-prompt-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Bar & AI Generator button */}
        <div className="px-5 py-3 border-b border-stone-800 flex items-center justify-between gap-2 overflow-x-auto bg-stone-850">
          <div className="flex items-center gap-1.5 shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-amber-500 text-stone-950 shadow-xs font-bold'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-750 border border-stone-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            id="fetch-ai-prompts-btn"
            type="button"
            disabled={isLoadingAiPrompts}
            onClick={handleFetchAiPrompts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-bold transition-all shrink-0 disabled:opacity-50"
          >
            {isLoadingAiPrompts ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Generate AI Prompts</span>
          </button>
        </div>

        {/* Prompts List */}
        <div className="p-5 overflow-y-auto space-y-3 max-h-[50vh]">
          {filteredPrompts.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              className="p-4 rounded-xl border border-stone-800 bg-stone-850/60 hover:border-amber-500/50 hover:bg-stone-800/80 cursor-pointer transition-all duration-150 group flex items-start justify-between gap-3"
            >
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-stone-800 border border-stone-700 text-amber-400 group-hover:border-amber-500/30 mb-1.5">
                  {item.category}
                </span>
                <p className="text-sm font-medium text-stone-200 group-hover:text-stone-100">
                  {item.prompt}
                </p>
              </div>

              <div className="shrink-0 pt-1">
                {copiedId === item.id ? (
                  <span className="p-1 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Use &rarr;
                  </span>
                )}
              </div>
            </div>
          ))}

          {filteredPrompts.length === 0 && (
            <div className="text-center py-8 text-stone-400 text-sm">
              No prompts in this category yet. Try generating custom AI prompts!
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-900 border-t border-stone-800 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-300 hover:text-stone-100 bg-stone-800 border border-stone-700 rounded-lg hover:bg-stone-750 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

