import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Mic,
  Lock,
  Flame,
  FileText,
  TrendingUp,
  Bot,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in cancelled. Please try again when you are ready.');
      } else {
        setErrorMessage(err?.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Brand Bar */}
      <header className="px-6 py-5 border-b border-gray-200/80 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-indigo-100" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">
              Mindful Journal AI
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>End-to-End User Isolation</span>
          </div>
        </div>
      </header>

      {/* Hero & Auth Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Value Proposition & Feature Highlights */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
              <Bot className="w-3.5 h-3.5" />
              <span>Powered by Gemini 3.7 Flash & Firestore</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Reflect deeply. Converse with AI. Track your emotional clarity.
            </h1>

            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              A private, secure journaling workspace designed for multi-turn mindfulness reflections, hands-free voice notes, and automated weekly AI digests.
            </p>

            {/* Feature Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-gray-200/80 shadow-xs">
                <Mic className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Voice-to-Text Entry</span>
                  <span className="text-[11px] text-gray-500">Dictate thoughts naturally via Web Speech API</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-gray-200/80 shadow-xs">
                <Bot className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Gemini 3.7 Flash</span>
                  <span className="text-[11px] text-gray-500">Multi-turn reflections & actionable takeaways</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-gray-200/80 shadow-xs">
                <TrendingUp className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Weekly AI Digests</span>
                  <span className="text-[11px] text-gray-500">Thematic synthesis & emotional trajectories</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-gray-200/80 shadow-xs">
                <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Per-User Isolation</span>
                  <span className="text-[11px] text-gray-500">Firestore security rules guarantee private data</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Google Sign-In Card */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-gray-200 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <ShieldCheck className="w-7 h-7 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Sign in to your Journal</h2>
              <p className="text-xs text-gray-500">
                Sign in securely with Google to access your private entries, chat logs, and streak metrics.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Google Sign-In Button */}
            <div className="space-y-3">
              <button
                id="google-sign-in-btn"
                type="button"
                disabled={isLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 px-4 rounded-xl border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {/* Google G SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoading ? 'Connecting to Google...' : 'Sign In with Google'}</span>
              </button>
            </div>

            {/* Security Assurance */}
            <div className="pt-2 border-t border-gray-100 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero passwords stored • Firebase Authentication</span>
              </div>
              <p className="text-[10px] text-gray-400">
                Your entries and conversations are strictly isolated to your UID via Cloud Firestore Security Rules.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-gray-200/80 bg-white text-center text-xs text-gray-500">
        Mindful Journal AI • Built with React, Tailwind CSS, Cloud Firestore & Gemini API
      </footer>
    </div>
  );
};
