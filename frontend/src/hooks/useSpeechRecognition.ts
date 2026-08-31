import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal ambient types for the Web Speech API (not part of TS's default DOM lib).
interface SpeechRecognitionResultEvent extends Event {
  results: {
    length: number;
    item(index: number): { 0: { transcript: string }; isFinal: boolean };
    [index: number]: { 0: { transcript: string }; isFinal: boolean };
  };
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult: (transcript: string) => void;
}

export function useSpeechRecognition({ lang = 'es-ES', onResult }: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const SpeechRecognitionImpl =
    typeof window !== 'undefined'
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;
  const isSupported = !!SpeechRecognitionImpl;

  useEffect(() => {
    if (!SpeechRecognitionImpl) return;

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results.item(event.results.length - 1)[0].transcript;
      onResultRef.current(transcript.trim());
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [SpeechRecognitionImpl, lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setIsListening(true);
    recognitionRef.current.start();
  }, [isListening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { isSupported, isListening, start, stop };
}
