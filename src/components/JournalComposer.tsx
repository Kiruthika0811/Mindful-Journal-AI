import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Download,
  BookOpen,
  Save,
  Tag,
  Smile,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  MessageSquare,
  Bot,
  User as UserIcon,
  HelpCircle,
  Lightbulb,
  Volume2,
  VolumeX,
  Square,
  Play,
  Sliders,
} from 'lucide-react';
import { JournalEntry, ChatMessage, MoodType, MoodOption } from '../types';
import { saveJournalEntry } from '../lib/firestoreService';
import { VoiceInputButton } from './VoiceInputButton';
import { PromptLibraryModal } from './PromptLibraryModal';
import { ExportModal } from './ExportModal';

interface JournalComposerProps {
  userId: string;
  activeEntry: JournalEntry | null;
  onEntrySaved: (entry: JournalEntry) => void;
  onNewEntry: () => void;
}

const MOODS: MoodOption[] = [
  { type: 'grateful', emoji: '😊', label: 'Grateful', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { type: 'peaceful', emoji: '🧘', label: 'Peaceful', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { type: 'energetic', emoji: '⚡', label: 'Energetic', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { type: 'reflective', emoji: '🤔', label: 'Reflective', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { type: 'inspired', emoji: '💡', label: 'Inspired', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { type: 'stressed', emoji: '😔', label: 'Stressed', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { type: 'down', emoji: '🌧️', label: 'Down', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { type: 'neutral', emoji: '😐', label: 'Neutral', color: 'bg-gray-50 text-gray-700 border-gray-200' },
];

const COMMON_TAGS = ['mindfulness', 'gratitude', 'work', 'personal', 'goals', 'health', 'challenges', 'family'];

export const JournalComposer: React.FC<JournalComposerProps> = ({
  userId,
  activeEntry,
  onEntrySaved,
  onNewEntry,
}) => {
  const [title, setTitle] = useState(activeEntry?.title || '');
  const [content, setContent] = useState(activeEntry?.content || '');
  const [selectedMood, setSelectedMood] = useState<MoodType>(activeEntry?.mood || 'reflective');
  const [tags, setTags] = useState<string[]>(activeEntry?.tags || ['mindfulness']);
  const [tagInput, setTagInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(activeEntry?.messages || []);
  const [chatInput, setChatInput] = useState('');
  const [summary, setSummary] = useState(activeEntry?.summary || '');
  const [themes, setThemes] = useState<string[]>(activeEntry?.themes || []);
  const [actionableTakeaway, setActionableTakeaway] = useState(activeEntry?.actionableTakeaway || '');
  
  // Speech Synthesis (Text-to-Speech) State
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mindful_auto_speak');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // UI & Loading States
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'chat'>('write');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentEntryIdRef = useRef<string>(activeEntry?.id || `entry-${Date.now()}`);

  // Auto-speak toggle
  const handleToggleAutoSpeak = () => {
    setAutoSpeak((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mindful_auto_speak', String(next));
      } catch {}
      return next;
    });
  };

  // Text cleanup for natural speech synthesis
  const cleanForSpeech = (text: string) => {
    return text
      .replace(/[*_#`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[•\-+]\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Stop currently playing speech
  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  };

  // Speak specific text using SpeechSynthesis API
  const speakText = (text: string, msgId?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // If already speaking this message, toggle stop
    if (isSpeaking && speakingMessageId === msgId) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();

    const clean = cleanForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95; // mindful speaking cadence
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Karen') ||
            v.name.includes('Serena'))
      ) || voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingMessageId(msgId || null);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('Speech synthesis error:', e);
      }
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Clean up speech synthesis on component unmount or entry switch
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeEntry]);

  // Sync when activeEntry changes externally
  useEffect(() => {
    if (activeEntry) {
      currentEntryIdRef.current = activeEntry.id;
      setTitle(activeEntry.title || '');
      setContent(activeEntry.content || '');
      setSelectedMood(activeEntry.mood || 'reflective');
      setTags(activeEntry.tags || []);
      setMessages(activeEntry.messages || []);
      setSummary(activeEntry.summary || '');
      setThemes(activeEntry.themes || []);
      setActionableTakeaway(activeEntry.actionableTakeaway || '');
      setSaveStatus('saved');
    } else {
      currentEntryIdRef.current = `entry-${Date.now()}`;
      setTitle('');
      setContent('');
      setSelectedMood('reflective');
      setTags(['mindfulness']);
      setMessages([]);
      setSummary('');
      setThemes([]);
      setActionableTakeaway('');
      setSaveStatus('idle');
    }
  }, [activeEntry]);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    if (activeTab === 'chat' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const selectedMoodObj = MOODS.find((m) => m.type === selectedMood) || MOODS[3];

  // Helper to persist current state to Firestore
  const persistEntry = async (
    overrideContent?: string,
    overrideMessages?: ChatMessage[],
    overrideSummary?: string,
    overrideThemes?: string[],
    overrideTakeaway?: string
  ) => {
    const finalContent = overrideContent !== undefined ? overrideContent : content;
    const finalMessages = overrideMessages !== undefined ? overrideMessages : messages;
    const finalSummary = overrideSummary !== undefined ? overrideSummary : summary;
    const finalThemes = overrideThemes !== undefined ? overrideThemes : themes;
    const finalTakeaway = overrideTakeaway !== undefined ? overrideTakeaway : actionableTakeaway;

    if (!finalContent.trim() && finalMessages.length === 0) {
      return;
    }

    setSaveStatus('saving');
    setSaveErrorMessage(null);

    const entryToSave: JournalEntry = {
      id: currentEntryIdRef.current,
      userId,
      title: title.trim() || generateDefaultTitle(finalContent),
      content: finalContent,
      mood: selectedMood,
      moodEmoji: selectedMoodObj.emoji,
      tags,
      messages: finalMessages,
      summary: finalSummary,
      themes: finalThemes,
      actionableTakeaway: finalTakeaway,
      createdAt: activeEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: finalContent.trim().split(/\s+/).filter(Boolean).length,
    };

    try {
      await saveJournalEntry(entryToSave);
      setSaveStatus('saved');
      onEntrySaved(entryToSave);
    } catch (err: any) {
      console.error('Failed to save journal entry to Firestore:', err);
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Database write error');
    }
  };

  const generateDefaultTitle = (text: string) => {
    if (!text.trim()) return 'Journal Reflection';
    const firstLine = text.trim().split('\n')[0];
    return firstLine.slice(0, 45) + (firstLine.length > 45 ? '...' : '');
  };

  // Add Tag
  const handleAddTag = (tagToAdd: string) => {
    const formatted = tagToAdd.trim().replace(/^#/, '').toLowerCase();
    if (formatted && !tags.includes(formatted)) {
      const newTags = [...tags, formatted];
      setTags(newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Voice to text transcript handler for journal body
  const handleVoiceTranscript = (transcriptText: string) => {
    setContent((prev) => {
      const updated = prev ? `${prev} ${transcriptText}` : transcriptText;
      return updated;
    });
    setSaveStatus('idle');
  };

  // Voice to text transcript handler for chat follow-up bar
  const handleChatVoiceTranscript = (transcriptText: string) => {
    setChatInput((prev) => {
      const updated = prev ? `${prev} ${transcriptText}` : transcriptText;
      return updated;
    });
  };

  // Unified Streaming Chat with Gemini
  const executeStreamingChat = async (updatedMessages: ChatMessage[]) => {
    setIsAiThinking(true);
    const clientStartTime = performance.now();

    // Clean up any empty or in-flight placeholder messages
    const cleanMessages = updatedMessages.filter(
      (m) => m && typeof m.content === 'string' && m.content.trim().length > 0
    );

    // Print full role-tagged history array in console for instant visual verification
    const roleTaggedHistoryForClientLog = cleanMessages.map((m, idx) => ({
      turn: idx + 1,
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      speaker: m.role === 'user' ? 'User' : 'Gemini AI',
      content: m.content.length > 90 ? `${m.content.slice(0, 90)}...` : m.content,
      charLength: m.content.length,
    }));

    console.log(`[Gemini Client] Full role-tagged conversation history sent to API (${cleanMessages.length} messages):`);
    console.table(roleTaggedHistoryForClientLog);

    const aiReplyId = `msg-${Date.now() + 1}`;
    const initialAiReply: ChatMessage = {
      id: aiReplyId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      modelUsed: 'gemini-3.6-flash',
      isStreaming: true,
    };

    // Insert live streaming message placeholder into UI state
    setMessages([...cleanMessages, initialAiReply]);

    let accumulatedContent = '';
    let modelUsed = 'gemini-3.6-flash';
    let firstChunkLogged = false;
    let serverTtftMs: number | undefined;
    let serverTotalMs: number | undefined;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          currentEntry: content,
          messages: cleanMessages,
          mood: `${selectedMoodObj.emoji} ${selectedMoodObj.label}`,
          tags,
          stream: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      if (!res.body) {
        throw new Error('Streaming response body is unavailable');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));

            if (data.type === 'chunk' && data.text) {
              if (!firstChunkLogged) {
                const clientTtft = performance.now() - clientStartTime;
                firstChunkLogged = true;
                console.log(`[Gemini Client Telemetry] First token received! Client TTFT: ${clientTtft.toFixed(1)}ms | Server TTFT: ${data.ttftMs ? data.ttftMs.toFixed(1) + 'ms' : 'N/A'} | Model: "${data.model || modelUsed}"`);
              }

              accumulatedContent += data.text;
              if (data.model) modelUsed = data.model;

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiReplyId
                    ? { ...m, content: accumulatedContent, modelUsed, isStreaming: true }
                    : m
                )
              );
            } else if (data.type === 'done') {
              if (data.modelUsed) modelUsed = data.modelUsed;
              serverTtftMs = data.ttftMs;
              serverTotalMs = data.totalMs;
            } else if (data.type === 'error') {
              throw new Error(data.error || 'Streaming error from Gemini server');
            }
          } catch (parseErr) {
            // Ignore incomplete JSON chunks in SSE stream
          }
        }
      }

      const clientTotalTime = performance.now() - clientStartTime;
      console.log(`[Gemini Client Telemetry] Request completed in ${clientTotalTime.toFixed(1)}ms (Server API Duration: ${serverTotalMs ? serverTotalMs.toFixed(1) + 'ms' : 'N/A'}, Client Network/Transport: ${(clientTotalTime - (serverTotalMs || clientTotalTime)).toFixed(1)}ms) | Model: "${modelUsed}" | Generated ${accumulatedContent.length} characters`);

      const finalAiReply: ChatMessage = {
        id: aiReplyId,
        role: 'assistant',
        content: accumulatedContent || 'Thank you for sharing your reflection.',
        timestamp: new Date().toISOString(),
        modelUsed,
        ttftMs: serverTtftMs,
        latencyMs: clientTotalTime,
        isStreaming: false,
      };

      const finalMessages = [...cleanMessages, finalAiReply];
      setMessages(finalMessages);

      // Auto-speak response if enabled
      if (autoSpeak && accumulatedContent) {
        speakText(accumulatedContent, aiReplyId);
      }

      // Auto-trigger summarization in background if not summarized yet
      if (!summary) {
        console.log('[Gemini Client] Chat stream completed. Dispatching secondary background summary call to /api/summarize...');
        generateSummary(content, finalMessages);
      } else {
        await persistEntry(content, finalMessages);
      }
    } catch (err: any) {
      console.error('[Gemini Client] Reflection streaming error:', err);
      const errorReply: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: 'I had trouble connecting to the reflection service. Please verify your connection or retry.',
        timestamp: new Date().toISOString(),
        isStreaming: false,
      };
      setMessages((prev) => prev.filter((m) => m.id !== aiReplyId).concat(errorReply));
    } finally {
      setIsAiThinking(false);
    }
  };

  // Trigger Gemini Reflection Dialogue
  const handleReflectWithGemini = async () => {
    if (!content.trim() && messages.length === 0) return;
    setActiveTab('chat');

    const cleanPrior = messages.filter((m) => m && m.content && m.content.trim().length > 0);

    const newUserMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim() ? content : 'Please reflect on my thoughts and mood.',
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...cleanPrior, newUserMsg];
    setMessages(updatedMessages);
    await executeStreamingChat(updatedMessages);
  };

  // Send follow-up chat message to Gemini
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isAiThinking) return;

    const userText = chatInput.trim();
    setChatInput('');

    const cleanPrior = messages.filter((m) => m && m.content && m.content.trim().length > 0);

    const newUserMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...cleanPrior, newUserMsg];
    setMessages(updatedMessages);
    await executeStreamingChat(updatedMessages);
  };

  // Generate structured summary & actionable takeaways
  const generateSummary = async (entryContent: string, currentMsgs: ChatMessage[]) => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: entryContent,
          messages: currentMsgs,
          mood: `${selectedMoodObj.emoji} ${selectedMoodObj.label}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.title && !title) setTitle(data.title);
        if (data.summary) setSummary(data.summary);
        if (Array.isArray(data.themes)) setThemes(data.themes);
        if (data.actionableTakeaway) setActionableTakeaway(data.actionableTakeaway);

        await persistEntry(
          entryContent,
          currentMsgs,
          data.summary,
          data.themes,
          data.actionableTakeaway
        );
      }
    } catch (err) {
      console.warn('Summary generation error:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            id="new-reflection-btn"
            type="button"
            onClick={onNewEntry}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Reflection</span>
          </button>

          <button
            id="open-prompt-library-btn"
            type="button"
            onClick={() => setIsPromptModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/80 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Prompt Library</span>
          </button>
        </div>

        {/* Save Status & Export */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Saving to Firestore...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <button
                type="button"
                onClick={() => persistEntry()}
                className="flex items-center gap-1 text-rose-600 hover:underline font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Save failed (Click to retry)</span>
              </button>
            )}
          </div>

          <button
            id="manual-save-btn"
            type="button"
            onClick={() => persistEntry()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            id="export-reflection-btn"
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Journal Composer */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 space-y-5">
          {/* Title Input */}
          <div>
            <input
              id="journal-title-input"
              type="text"
              placeholder="Title your reflection... (e.g., Finding Balance Under Pressure)"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaveStatus('idle');
              }}
              className="w-full text-lg sm:text-xl font-bold text-gray-900 placeholder-gray-400 border-b border-gray-100 pb-2 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Mood Selector Bar */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-gray-400" />
              <span>How are you feeling right now?</span>
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {MOODS.map((m) => {
                const isSelected = selectedMood === m.type;
                return (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => {
                      setSelectedMood(m.type);
                      setSaveStatus('idle');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0 ${
                      isSelected
                        ? `${m.color} ring-2 ring-indigo-300 shadow-xs scale-105`
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Textarea with Voice Input & Tools */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Journal Reflection
              </label>
              <div className="flex items-center gap-2">
                <VoiceInputButton
                  onTranscript={handleVoiceTranscript}
                  isAudioPlaying={isSpeaking}
                  onStopSpeech={stopSpeaking}
                />
              </div>
            </div>

            <textarea
              id="journal-content-textarea"
              rows={11}
              placeholder="What is on your mind today? Write freely or speak into the microphone. Unpack your thoughts, emotions, challenges, or gratitude..."
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setSaveStatus('idle');
              }}
              className="w-full p-4 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
            />

            <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
              <span>{wordCount} words</span>
              <span>Web Speech & Gemini Protected</span>
            </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <span>Tags & Themes</span>
            </label>

            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-indigo-900 font-bold ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddTag(tagInput);
                }}
                className="inline-flex"
              >
                <input
                  type="text"
                  placeholder="+ Add tag (Enter)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="px-2.5 py-1 rounded-md border border-gray-200 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                />
              </form>
            </div>

            {/* Suggested Tags */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
              <span className="text-[11px] text-gray-400 shrink-0">Quick tags:</span>
              {COMMON_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleAddTag(t)}
                  className="text-[11px] text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded transition-colors"
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Primary Action Button */}
          <div className="pt-3">
            <button
              id="reflect-with-gemini-btn"
              type="button"
              disabled={isAiThinking || (!content.trim() && messages.length === 0)}
              onClick={handleReflectWithGemini}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAiThinking ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-indigo-200" />
                  <span>Gemini is reflecting on your entry...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>Converse & Reflect with Gemini</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Multi-turn Gemini Companion & AI Insights */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 flex flex-col space-y-4 min-h-[500px]">
          {/* Header Switcher & Audio Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Gemini AI Companion</h3>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Stop Speaking Button (visible whenever speech synthesis is active) */}
              {isSpeaking && (
                <button
                  id="stop-speaking-btn"
                  type="button"
                  onClick={stopSpeaking}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-all animate-pulse"
                  title="Stop reading aloud"
                >
                  <Square className="w-3 h-3 fill-rose-600" />
                  <span>Stop Voice</span>
                </button>
              )}

              {/* Auto-Speak Toggle */}
              <button
                id="auto-speak-toggle-btn"
                type="button"
                onClick={handleToggleAutoSpeak}
                title={`Auto-speak replies: ${autoSpeak ? 'Enabled (Click to turn off)' : 'Disabled (Click to turn on)'}`}
                className={`px-2 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition-all ${
                  autoSpeak
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {autoSpeak ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[11px]">Voice On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[11px]">Voice Off</span>
                  </>
                )}
              </button>

              {/* View Switcher */}
              <div className="flex items-center gap-1 text-xs pl-1 border-l border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Chat ({messages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    activeTab === 'write'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Insights
                </button>
              </div>
            </div>
          </div>

          {/* AI Insights Overview Box (Always shown or accessible) */}
          {(summary || actionableTakeaway || isSummarizing) && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Key Synthesis & Takeaway</span>
                </span>
                <div className="flex items-center gap-2">
                  {summary && (
                    <button
                      type="button"
                      onClick={() => speakText(`${summary}. Mindful action: ${actionableTakeaway}`, 'summary-takeaway')}
                      title={isSpeaking && speakingMessageId === 'summary-takeaway' ? 'Stop speaking' : 'Read synthesis aloud'}
                      className="p-1 rounded-md text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                      {isSpeaking && speakingMessageId === 'summary-takeaway' ? (
                        <Square className="w-3.5 h-3.5 fill-indigo-600" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {isSummarizing && <span className="text-[10px] text-indigo-600 animate-pulse">Summarizing...</span>}
                </div>
              </div>

              {summary && <p className="text-xs text-gray-700 leading-relaxed">{summary}</p>}

              {actionableTakeaway && (
                <div className="pt-2 border-t border-indigo-100/80">
                  <span className="text-[11px] font-semibold text-indigo-700 block mb-0.5">Mindful Action:</span>
                  <p className="text-xs font-medium text-gray-800 italic bg-white/70 p-2 rounded-lg border border-indigo-100">
                    "{actionableTakeaway}"
                  </p>
                </div>
              )}

              {themes.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {themes.map((th, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white text-indigo-700 text-[10px] font-medium rounded border border-indigo-100">
                      {th}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto max-h-[380px] space-y-3.5 pr-1">
            {messages.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-gray-800 text-sm">Your Personal Reflective AI</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                  Write your journal entry on the left and click "Converse & Reflect". Gemini will unpack themes, offer gentle perspective, and help you brainstorm next steps.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!content) setContent("Today I noticed I was feeling a bit overwhelmed by my to-do list, but I managed to take a quiet 15-minute walk which helped me reset.");
                      handleReflectWithGemini();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Try sample reflection</span>
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isAi = msg.role === 'assistant' || msg.role === 'model';
                const isThisSpeaking = isSpeaking && speakingMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAi && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        isAi
                          ? 'bg-gray-50 text-gray-800 border border-gray-200/80 shadow-xs'
                          : 'bg-indigo-600 text-white rounded-br-none shadow-xs'
                      }`}
                    >
                      {isAi && msg.isStreaming && !msg.content ? (
                        <div className="flex items-center gap-2 text-indigo-600 font-medium py-1">
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          <span>Streaming reflection from {msg.modelUsed || 'gemini-3.6-flash'}...</span>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">
                          {msg.content}
                          {isAi && msg.isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 bg-indigo-500 animate-pulse ml-1 align-middle rounded-xs" />
                          )}
                        </div>
                      )}
                      
                      <div
                        className={`text-[10px] mt-2 flex items-center justify-between gap-2 border-t pt-1.5 ${
                          isAi ? 'border-gray-200/70 text-gray-400' : 'border-indigo-500/50 text-indigo-200'
                        }`}
                      >
                        {isAi ? (
                          <div className="flex items-center gap-1.5">
                            {!msg.isStreaming && msg.content && (
                              <button
                                type="button"
                                onClick={() => speakText(msg.content, msg.id)}
                                title={
                                  isThisSpeaking
                                    ? 'Stop reading aloud'
                                    : 'Replay voice output'
                                }
                                className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-medium transition-all ${
                                  isThisSpeaking
                                    ? 'bg-indigo-600 text-white shadow-xs animate-pulse'
                                    : 'bg-white text-indigo-700 border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300'
                                }`}
                              >
                                {isThisSpeaking ? (
                                  <>
                                    <Square className="w-3 h-3 fill-white" />
                                    <span>Stop</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3 h-3 text-indigo-600" />
                                    <span>Speak</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span />
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.modelUsed && isAi && (
                            <span className="font-mono text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 border border-gray-200/60">
                              {msg.modelUsed}
                              {msg.latencyMs ? ` (${Math.round(msg.latencyMs)}ms)` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isAi && (
                      <div className="w-7 h-7 rounded-lg bg-gray-700 text-white flex items-center justify-center shrink-0 text-xs mt-0.5">
                        <UserIcon className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isAiThinking && !messages.some((m) => m.isStreaming) && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 p-3 rounded-xl animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Gemini is generating mindful perspective...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Reply Input Bar */}
          <form onSubmit={handleSendChatMessage} className="pt-2 border-t border-gray-100 flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <input
                id="chat-reply-input"
                type="text"
                placeholder="Ask Gemini a follow-up, request reframing, or explore solutions..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isAiThinking}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <div className="absolute right-1 flex items-center">
                <VoiceInputButton
                  id="chat-voice-input-btn"
                  compact
                  disabled={isAiThinking}
                  isAudioPlaying={isSpeaking}
                  onStopSpeech={stopSpeaking}
                  onTranscript={handleChatVoiceTranscript}
                  title="Speak to dictate your follow-up message (Voice-to-Text)"
                />
              </div>
            </div>
            <button
              id="send-chat-reply-btn"
              type="submit"
              disabled={isAiThinking || !chatInput.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 shrink-0 shadow-2xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Modals */}
      <PromptLibraryModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onSelectPrompt={(p) => {
          setContent((prev) => (prev ? `${prev}\n\nPrompt: ${p}\n` : `Prompt: ${p}\n`));
          setSaveStatus('idle');
        }}
        currentMood={selectedMood}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        entry={
          content.trim() || messages.length > 0
            ? {
                id: currentEntryIdRef.current,
                userId,
                title: title || 'Journal Reflection',
                content,
                mood: selectedMood,
                moodEmoji: selectedMoodObj.emoji,
                tags,
                messages,
                summary,
                themes,
                actionableTakeaway,
                createdAt: activeEntry?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                wordCount,
              }
            : null
        }
      />
    </div>
  );
};
