import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
  id?: string;
  title?: string;
  label?: string;
  className?: string;
  isAudioPlaying?: boolean;
  onStopSpeech?: () => void;
}

// Support Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  disabled = false,
  compact = false,
  id = 'voice-input-toggle-btn',
  title,
  label = 'Voice Note',
  className = '',
  isAudioPlaying = false,
  onStopSpeech,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const wasListeningBeforeSpeechRef = useRef(false);
  const noSpeechCountRef = useRef(0);
  const noticeTimerRef = useRef<any>(null);
  const resumeTimerRef = useRef<any>(null);

  const showNotice = (msg: string, autoHideMs = 6000) => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    setErrorNotice(msg);
    if (autoHideMs > 0) {
      noticeTimerRef.current = setTimeout(() => {
        setErrorNotice(null);
      }, autoHideMs);
    }
  };

  // Automatically pause/resume SpeechRecognition when speech synthesis starts or stops
  useEffect(() => {
    if (isAudioPlaying) {
      if (isListeningRef.current) {
        console.log('[SpeechRecognition] Paused — speech synthesis is playing');
        wasListeningBeforeSpeechRef.current = true;
        isListeningRef.current = false;
        setIsListening(false);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // ignore
          }
        }
      }
    } else {
      if (wasListeningBeforeSpeechRef.current) {
        console.log('[SpeechRecognition] Resumed — speech synthesis ended');
        wasListeningBeforeSpeechRef.current = false;
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        // Small buffer (300ms) to ensure audio hardware output is completely silent before opening mic
        resumeTimerRef.current = setTimeout(() => {
          if (recognitionRef.current && !isListeningRef.current) {
            try {
              noSpeechCountRef.current = 0;
              isListeningRef.current = true;
              recognitionRef.current.start();
              setIsListening(true);
            } catch (err: any) {
              if (!err.message?.includes('already started')) {
                console.warn('[SpeechRecognition] Auto-resume error:', err);
              }
            }
          }
        }, 300);
      }
    }

    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [isAudioPlaying]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[SpeechRecognition] Web Speech API not supported in this browser.');
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('[SpeechRecognition] onstart fired — microphone session active and listening');
        setIsListening(true);
        isListeningRef.current = true;
      };

      recognition.onaudiostart = () => {
        console.log('[SpeechRecognition] onaudiostart fired — audio capturing hardware started');
      };

      recognition.onsoundstart = () => {
        console.log('[SpeechRecognition] onsoundstart fired — sound received by speech engine');
      };

      recognition.onspeechstart = () => {
        console.log('[SpeechRecognition] onspeechstart fired — human speech detected by speech engine');
        noSpeechCountRef.current = 0;
      };

      recognition.onresult = (event: any) => {
        // Safeguard: Mute/discard any incoming transcripts while speech synthesis is active
        const isSynthesizing =
          isAudioPlaying ||
          (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking);

        if (isSynthesizing) {
          console.log('[SpeechRecognition] Paused — speech synthesis is playing (discarding microphone transcript)');
          return;
        }

        console.log('[SpeechRecognition] onresult fired — results length:', event.results.length);
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          console.log('[SpeechRecognition] Final transcript captured:', finalTranscript.trim());
          onTranscript(finalTranscript);
          noSpeechCountRef.current = 0;
          setErrorNotice(null);
        }
      };

      recognition.onspeechend = () => {
        console.log('[SpeechRecognition] onspeechend fired — speech segment ended');
      };

      recognition.onerror = (event: any) => {
        console.warn('[SpeechRecognition] onerror event:', event.error);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showNotice(
            'Microphone access is blocked in this preview iframe. Please allow microphone permissions in browser settings or open in a new tab.',
            9000
          );
          setIsListening(false);
          isListeningRef.current = false;
        } else if (event.error === 'no-speech') {
          noSpeechCountRef.current += 1;
          console.log(`[SpeechRecognition] no-speech occurrence #${noSpeechCountRef.current}`);

          // Automatic silent restart once before presenting an error
          if (noSpeechCountRef.current === 1 && isListeningRef.current && !isAudioPlaying) {
            console.log('[SpeechRecognition] Attempting silent restart for first no-speech timeout...');
            try {
              setTimeout(() => {
                if (isListeningRef.current && recognitionRef.current && !isAudioPlaying) {
                  try {
                    recognitionRef.current.start();
                  } catch (restartErr: any) {
                    if (!restartErr.message?.includes('already started')) {
                      console.warn('[SpeechRecognition] Silent restart error:', restartErr);
                    }
                  }
                }
              }, 250);
              return;
            } catch (retryErr) {
              console.warn('[SpeechRecognition] Silent restart failed:', retryErr);
            }
          } else if (!isAudioPlaying) {
            showNotice('No speech detected — please speak clearly into your microphone.', 4500);
            setIsListening(false);
            isListeningRef.current = false;
          }
        } else if (event.error === 'network') {
          showNotice('Speech recognition network error — please check your internet connection.', 5000);
          setIsListening(false);
          isListeningRef.current = false;
        } else if (event.error !== 'aborted') {
          showNotice(`Voice input issue: ${event.error}`, 5000);
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      recognition.onend = () => {
        console.log('[SpeechRecognition] onend fired — session ended');

        // If speech synthesis is playing, do not auto-restart recognition until playback concludes
        const isSynthesizing =
          isAudioPlaying ||
          (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking);

        if (isSynthesizing) {
          console.log('[SpeechRecognition] Recognition ended during active speech synthesis — paused until audio completes');
          return;
        }

        // If user is still marked as listening and it wasn't an intentional stop or repeated failure, auto-restart
        if (isListeningRef.current && noSpeechCountRef.current < 2) {
          console.log('[SpeechRecognition] Session ended while active, restarting continuous recognition...');
          try {
            recognition.start();
          } catch {
            setIsListening(false);
            isListeningRef.current = false;
          }
        } else {
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('[SpeechRecognition] Initialization failed:', err);
      setIsSupported(false);
    }

    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [onTranscript, isAudioPlaying]);

  const toggleListening = async () => {
    setErrorNotice(null);
    if (!recognitionRef.current) return;

    // If speech synthesis is active, stop it immediately when user explicitly interacts with the mic
    if (isAudioPlaying || (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking)) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (onStopSpeech) {
        onStopSpeech();
      }
    }

    if (isListeningRef.current) {
      console.log('[SpeechRecognition] User stopped listening');
      isListeningRef.current = false;
      wasListeningBeforeSpeechRef.current = false;
      noSpeechCountRef.current = 0;
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
      setIsListening(false);
      return;
    }

    // Step 1: Explicitly verify microphone hardware & permissions via getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        console.log('[SpeechRecognition] Requesting microphone access via getUserMedia...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[SpeechRecognition] Microphone permission granted. Releasing test track...');
        // Release the test stream so the SpeechRecognition engine has uncontended access to the mic
        stream.getTracks().forEach((track) => track.stop());
      } catch (permissionErr: any) {
        console.warn('[SpeechRecognition] Microphone getUserMedia error:', permissionErr);
        if (
          permissionErr.name === 'NotAllowedError' ||
          permissionErr.name === 'PermissionDeniedError' ||
          permissionErr.name === 'SecurityError'
        ) {
          showNotice(
            'Microphone access is blocked in this preview iframe. Please allow microphone permissions or open the app in a new tab.',
            9000
          );
        } else if (permissionErr.name === 'NotFoundError' || permissionErr.name === 'DevicesNotFoundError') {
          showNotice('No microphone hardware found. Please connect a microphone and try again.', 6000);
        } else {
          showNotice(`Microphone error: ${permissionErr.message || 'Access failed'}`, 6000);
        }
        setIsListening(false);
        isListeningRef.current = false;
        return;
      }
    }

    // Step 2: Short delay (250ms) to allow audio hardware handshake to settle before SpeechRecognition.start()
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Step 3: Start SpeechRecognition
    try {
      console.log('[SpeechRecognition] Starting speech recognition engine...');
      noSpeechCountRef.current = 0;
      isListeningRef.current = true;
      wasListeningBeforeSpeechRef.current = false;
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err: any) {
      console.warn('[SpeechRecognition] Could not start recognition:', err);
      if (err.message && err.message.includes('already started')) {
        setIsListening(true);
        isListeningRef.current = true;
      } else {
        showNotice('Could not initialize voice recognition. Please try clicking again.', 4000);
        setIsListening(false);
        isListeningRef.current = false;
      }
    }
  };

  if (!isSupported) {
    if (compact) {
      return null;
    }
    return (
      <button
        id={id}
        type="button"
        disabled
        title="Voice input is not supported in this browser"
        className="p-2.5 rounded-xl border border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
      >
        <MicOff className="w-4 h-4" />
      </button>
    );
  }

  const defaultTitle = isListening
    ? 'Stop voice recording'
    : compact
    ? 'Dictate message with voice'
    : 'Speak to write journal (Voice-to-Text)';

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={toggleListening}
        title={title || defaultTitle}
        className={`relative transition-all duration-200 flex items-center justify-center gap-1.5 ${
          compact
            ? `p-2 rounded-lg ${
                isListening
                  ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-300 animate-pulse'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`
            : `p-2.5 rounded-xl border text-sm font-medium ${
                isListening
                  ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-xs animate-pulse ring-2 ring-rose-200'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isListening ? (
          <>
            <Mic className={`${compact ? 'w-4 h-4' : 'w-4 h-4'} text-rose-600`} />
            {!compact && <span className="text-xs font-semibold text-rose-600 hidden sm:inline">Listening...</span>}
          </>
        ) : (
          <>
            <Mic className={`${compact ? 'w-4 h-4' : 'w-4 h-4'} ${compact ? 'text-gray-500' : 'text-gray-500'}`} />
            {!compact && <span className="text-xs text-gray-600 hidden sm:inline">{label}</span>}
          </>
        )}
      </button>

      {errorNotice && (
        <div className="absolute right-0 bottom-full mb-2 w-64 p-2 bg-rose-900 text-white text-xs rounded-lg shadow-lg z-50 flex items-start gap-1.5 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-rose-300 shrink-0 mt-0.5" />
          <span className="flex-1">{errorNotice}</span>
          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            className="ml-auto text-rose-200 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
