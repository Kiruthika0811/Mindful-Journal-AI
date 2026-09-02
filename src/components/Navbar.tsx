import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  History,
  TrendingUp,
  Flame,
  LogOut,
  Sparkles,
  Plus,
  Compass,
} from 'lucide-react';
import { FirebaseUser, logOut } from '../lib/firebase';
import { StreakStats } from '../types';

interface NavbarProps {
  user: FirebaseUser;
  activeTab: 'dashboard' | 'composer' | 'history' | 'digest' | 'streak';
  onTabChange: (tab: 'dashboard' | 'composer' | 'history' | 'digest' | 'streak') => void;
  onNewReflection: () => void;
  stats: StreakStats;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onTabChange,
  onNewReflection,
  stats,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[4.25rem] sm:min-h-[4.5rem] py-2 gap-3 lg:gap-6">
          {/* Section 1 (Far Left): Brand Logo & Title with generous vertical padding */}
          <div
            id="navbar-brand-logo"
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-3 cursor-pointer group shrink-0 select-none py-1"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-500 to-orange-600 text-stone-950 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Sparkles className="w-5 h-5 text-stone-950 stroke-[2.3]" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-base sm:text-lg font-extrabold text-stone-50 tracking-tight leading-tight flex items-center gap-1.5 font-serif group-hover:text-amber-300 transition-colors">
                <span>Mindful Journal AI</span>
              </h1>
              <span className="text-[11px] text-stone-400 font-medium leading-normal tracking-normal block pt-0.5">
                Gemini & Firestore Protected
              </span>
            </div>
          </div>

          {/* Section 2 (Center): Evenly Distributed Navigation Links */}
          <nav className="hidden md:flex items-center justify-center gap-1 lg:gap-1.5 xl:gap-2 flex-1 max-w-2xl px-2">
            <button
              id="nav-tab-dashboard"
              type="button"
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/80 border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-tab-composer"
              type="button"
              onClick={() => onTabChange('composer')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'composer'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/80 border border-transparent'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">Journal & Chat</span>
              <span className="lg:hidden">Journal</span>
            </button>

            <button
              id="nav-tab-history"
              type="button"
              onClick={() => onTabChange('history')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/80 border border-transparent'
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">History & Search</span>
              <span className="lg:hidden">History</span>
            </button>

            <button
              id="nav-tab-digest"
              type="button"
              onClick={() => onTabChange('digest')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'digest'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/80 border border-transparent'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="hidden xl:inline">Weekly AI Digest</span>
              <span className="xl:hidden">Weekly Digest</span>
            </button>

            <button
              id="nav-tab-streak"
              type="button"
              onClick={() => onTabChange('streak')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'streak'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/80 border border-transparent'
              }`}
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span className="hidden xl:inline">Insights & Streak</span>
              <span className="xl:hidden">Insights</span>
            </button>
          </nav>

          {/* Section 3 (Far Right): Streak Badge + Action Button + Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Streak Counter Badge */}
            <button
              type="button"
              onClick={() => onTabChange('streak')}
              title={`Current Mindful Streak: ${stats.currentStreak} active days`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold transition-all shadow-xs"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              <span>{stats.currentStreak}d</span>
              <span className="hidden sm:inline">Streak</span>
            </button>

            {/* Quick New Reflection Button */}
            <button
              id="navbar-new-reflection-btn"
              type="button"
              onClick={onNewReflection}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold shadow-md hover:shadow-amber-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">New Entry</span>
              <span className="sm:hidden">New</span>
            </button>

            {/* User Profile Avatar & Sign Out */}
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-stone-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-stone-700 shadow-xs object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-xs flex items-center justify-center">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}

              <button
                id="sign-out-btn"
                type="button"
                onClick={() => logOut()}
                title="Sign Out"
                className="p-2 rounded-xl text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-stone-800/80 overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onTabChange('composer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'composer'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Journal
          </button>
          <button
            type="button"
            onClick={() => onTabChange('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            History
          </button>
          <button
            type="button"
            onClick={() => onTabChange('digest')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'digest'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Digest
          </button>
          <button
            type="button"
            onClick={() => onTabChange('streak')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'streak'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Streak
          </button>
        </div>
      </div>
    </header>
  );
};
