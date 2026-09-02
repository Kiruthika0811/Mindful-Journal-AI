import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { JournalEntry, WeeklyDigest, StreakStats } from '../types';

/**
 * Strips all undefined properties from an object recursively to ensure zero Firestore payload crashes
 */
function sanitizePayload<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Real-time listener for all entries of a specific user
 */
export function subscribeToUserEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const entriesRef = collection(db, 'users', userId, 'entries');
  const q = query(entriesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId,
          title: data.title || 'Untitled Reflection',
          content: data.content || '',
          mood: data.mood || 'reflective',
          moodEmoji: data.moodEmoji || '🤔',
          tags: Array.isArray(data.tags) ? data.tags : [],
          messages: Array.isArray(data.messages) ? data.messages : [],
          summary: data.summary || '',
          themes: Array.isArray(data.themes) ? data.themes : [],
          sentiment: data.sentiment || 'reflective',
          actionableTakeaway: data.actionableTakeaway || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          wordCount: typeof data.wordCount === 'number' ? data.wordCount : (data.content || '').trim().split(/\s+/).filter(Boolean).length,
        };
      });
      onUpdate(entries);
    },
    (err) => {
      console.error('Error subscribing to user entries:', err);
      onError(err);
    }
  );
}

/**
 * Saves or updates a journal entry in the user's isolated subcollection
 */
export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  if (!entry.userId || !entry.id) {
    throw new Error('Valid User ID and Entry ID are required to save.');
  }

  const entryRef = doc(db, 'users', entry.userId, 'entries', entry.id);
  const cleanData = sanitizePayload({
    id: entry.id,
    userId: entry.userId,
    title: entry.title.trim() || 'Untitled Reflection',
    content: entry.content || '',
    mood: entry.mood,
    moodEmoji: entry.moodEmoji,
    tags: entry.tags,
    messages: entry.messages,
    summary: entry.summary || '',
    themes: entry.themes || [],
    sentiment: entry.sentiment || 'reflective',
    actionableTakeaway: entry.actionableTakeaway || '',
    createdAt: entry.createdAt,
    updatedAt: new Date().toISOString(),
    wordCount: (entry.content || '').trim().split(/\s+/).filter(Boolean).length,
  });

  await setDoc(entryRef, cleanData, { merge: true });
}

/**
 * Deletes an entry from Firestore
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) return;
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(entryRef);
}

/**
 * Real-time listener for weekly AI digests
 */
export function subscribeToWeeklyDigests(
  userId: string,
  onUpdate: (digests: WeeklyDigest[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const digestsRef = collection(db, 'users', userId, 'digests');
  const q = query(digestsRef, orderBy('generatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const digests: WeeklyDigest[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId,
          weekRange: data.weekRange || '',
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          headline: data.headline || 'Weekly Reflection Digest',
          overview: data.overview || '',
          topThemes: Array.isArray(data.topThemes) ? data.topThemes : [],
          moodTrends: data.moodTrends || '',
          celebrations: Array.isArray(data.celebrations) ? data.celebrations : [],
          mindfulInquiryForNextWeek: Array.isArray(data.mindfulInquiryForNextWeek) ? data.mindfulInquiryForNextWeek : [],
          recommendedFocus: data.recommendedFocus || '',
          entriesAnalyzedCount: data.entriesAnalyzedCount || 0,
          generatedAt: data.generatedAt || new Date().toISOString(),
          modelUsed: data.modelUsed,
        };
      });
      onUpdate(digests);
    },
    (err) => {
      console.error('Error subscribing to weekly digests:', err);
      onError(err);
    }
  );
}

/**
 * Saves a generated weekly AI digest to the user's isolated subcollection
 */
export async function saveWeeklyDigest(digest: WeeklyDigest): Promise<void> {
  if (!digest.userId || !digest.id) {
    throw new Error('Valid User ID and Digest ID are required.');
  }
  const digestRef = doc(db, 'users', digest.userId, 'digests', digest.id);
  const cleanData = sanitizePayload(digest);
  await setDoc(digestRef, cleanData, { merge: true });
}

/**
 * Computes streak and consistency analytics from the entries array
 */
export function calculateStreakStats(entries: JournalEntry[]): StreakStats {
  if (!entries || entries.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalEntries: 0,
      totalWords: 0,
      moodCounts: {},
      activeDates: [],
    };
  }

  const dateSet = new Set<string>();
  let totalWords = 0;
  const moodCounts: Record<string, number> = {};

  for (const entry of entries) {
    const d = new Date(entry.createdAt);
    if (!isNaN(d.getTime())) {
      const dateStr = d.toISOString().split('T')[0];
      dateSet.add(dateStr);
    }
    totalWords += entry.wordCount || 0;
    const moodKey = entry.moodEmoji || '🤔';
    moodCounts[moodKey] = (moodCounts[moodKey] || 0) + 1;
  }

  const sortedDates = Array.from(dateSet).sort(); // chronological asc
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date();
  
  // Check if user journaled today
  if (!dateSet.has(todayStr)) {
    // Check if journaled yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const formatted = checkDate.toISOString().split('T')[0];
    if (dateSet.has(formatted)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let running = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const curr = new Date(dateStr);
    if (!prevDate) {
      running = 1;
    } else {
      const diffDays = Math.round((curr.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        running++;
      } else if (diffDays > 1) {
        running = 1;
      }
    }
    if (running > longestStreak) {
      longestStreak = running;
    }
    prevDate = curr;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    totalEntries: entries.length,
    totalWords,
    moodCounts,
    activeDates: sortedDates,
    lastJournalDate: sortedDates[sortedDates.length - 1],
  };
}
