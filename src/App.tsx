import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, FirebaseUser, auth } from './lib/firebase';
import {
  subscribeToUserEntries,
  subscribeToWeeklyDigests,
  calculateStreakStats,
} from './lib/firestoreService';
import { JournalEntry, WeeklyDigest, StreakStats } from './types';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { DashboardHome } from './components/DashboardHome';
import { JournalComposer } from './components/JournalComposer';
import { HistoryView } from './components/HistoryView';
import { WeeklyDigestView } from './components/WeeklyDigestView';
import { StreakTracker } from './components/StreakTracker';
import { Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'composer' | 'history' | 'digest' | 'streak'>('dashboard');

  // Firestore state
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [digests, setDigests] = useState<WeeklyDigest[]>([]);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('[Firebase Auth] onAuthStateChanged payload:', {
        uid: currentUser?.uid,
        email: currentUser?.email,
        displayName: currentUser?.displayName,
        photoURL: currentUser?.photoURL,
      });
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setEntries([]);
        setDigests([]);
        setActiveEntry(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore real-time streams when user is logged in
  useEffect(() => {
    if (!user) return;

    setDbError(null);

    const unsubEntries = subscribeToUserEntries(
      user.uid,
      (updatedEntries) => {
        setEntries(updatedEntries);
      },
      (err) => {
        console.error('Firestore entries subscription error:', err);
        setDbError('Error loading journal entries. Please check Firestore security rules or connection.');
      }
    );

    const unsubDigests = subscribeToWeeklyDigests(
      user.uid,
      (updatedDigests) => {
        setDigests(updatedDigests);
      },
      (err) => {
        console.error('Firestore digests subscription error:', err);
      }
    );

    return () => {
      unsubEntries();
      unsubDigests();
    };
  }, [user]);

  // Compute live streak statistics
  const stats: StreakStats = calculateStreakStats(entries);

  // Handlers
  const handleSelectEntryFromHistory = (entry: JournalEntry) => {
    setActiveEntry(entry);
    setActiveTab('composer');
  };

  const handleStartNewEntry = () => {
    setActiveEntry(null);
    setActiveTab('composer');
  };

  const handleEntrySaved = (savedEntry: JournalEntry) => {
    setActiveEntry(savedEntry);
  };

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center animate-bounce shadow-md">
            <Sparkles className="w-6 h-6 text-stone-950" />
          </div>
          <span className="text-sm font-semibold text-stone-300">Connecting to Mindful Journal...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated -> show Auth Screen
  if (!user) {
    return <AuthScreen onAuthSuccess={() => setActiveTab('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col font-sans antialiased text-stone-100">
      {/* Top Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        onNewReflection={handleStartNewEntry}
        stats={stats}
      />

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {dbError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{dbError}</span>
            </div>
            <button
              type="button"
              onClick={() => setDbError(null)}
              className="text-rose-400 hover:text-rose-200 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardHome
            user={user}
            entries={entries}
            stats={stats}
            onNewReflection={handleStartNewEntry}
            onOpenWeeklyDigest={() => setActiveTab('digest')}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectEntry={handleSelectEntryFromHistory}
          />
        )}

        {activeTab === 'composer' && (
          <JournalComposer
            userId={user.uid}
            activeEntry={activeEntry}
            onEntrySaved={handleEntrySaved}
            onNewEntry={handleStartNewEntry}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            userId={user.uid}
            entries={entries}
            onSelectEntry={handleSelectEntryFromHistory}
            onNewEntry={handleStartNewEntry}
          />
        )}

        {activeTab === 'digest' && (
          <WeeklyDigestView
            userId={user.uid}
            entries={entries}
            digests={digests}
          />
        )}

        {activeTab === 'streak' && (
          <StreakTracker
            stats={stats}
            onStartReflection={handleStartNewEntry}
          />
        )}
      </main>

      {/* Persistent App Footer */}
      <footer className="py-4 border-t border-stone-800 bg-stone-900/80 text-center text-xs text-stone-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Mindful Journal AI • Google Sign-In & Cloud Firestore Isolated</span>
          <span className="text-stone-500">Gemini 3.7 Flash Engine • Web Speech API</span>
        </div>
      </footer>
    </div>
  );
}
