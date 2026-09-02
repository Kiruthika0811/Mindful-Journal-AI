export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
  ttftMs?: number;
  latencyMs?: number;
  isStreaming?: boolean;
}

export type MoodType =
  | 'grateful'
  | 'peaceful'
  | 'energetic'
  | 'reflective'
  | 'inspired'
  | 'stressed'
  | 'down'
  | 'neutral';

export interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
  color: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood: MoodType;
  moodEmoji: string;
  tags: string[];
  messages: ChatMessage[];
  summary?: string;
  themes?: string[];
  sentiment?: string;
  actionableTakeaway?: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
}

export interface WeeklyDigest {
  id: string;
  userId: string;
  weekRange: string;
  startDate: string;
  endDate: string;
  headline: string;
  overview: string;
  topThemes: string[];
  moodTrends: string;
  celebrations: string[];
  mindfulInquiryForNextWeek: string[];
  recommendedFocus: string;
  entriesAnalyzedCount: number;
  generatedAt: string;
  modelUsed?: string;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
  totalWords: number;
  moodCounts: Record<string, number>;
  activeDates: string[]; // YYYY-MM-DD
  lastJournalDate?: string;
}

export interface PromptItem {
  id: string;
  category: string;
  prompt: string;
}

export interface FilterOptions {
  searchQuery: string;
  selectedMood: string;
  selectedTag: string;
  dateRange: 'all' | 'today' | '7days' | '30days' | 'custom';
  startDate?: string;
  endDate?: string;
}
