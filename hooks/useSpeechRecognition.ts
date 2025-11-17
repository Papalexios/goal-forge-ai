
// Fix: Added type definitions for the Web Speech API as they are not included in TypeScript's standard DOM library.
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

// FIX: Removed duplicate `declare var` statements which caused identifier conflicts.
// The Window interface is now used to declare these properties.

// Fix: Augment the global Window interface to include SpeechRecognition APIs for TypeScript.
// This is necessary because this file is a module and we need to modify the global scope.
declare global {
  interface Window {
    // FIX: Correctly typed SpeechRecognition properties as constructors that return an instance of the SpeechRecognition interface.
    SpeechRecognition?: { new (): SpeechRecognition };
    webkitSpeechRecognition?: { new (): SpeechRecognition };
  }
}


import { useState, useRef, useEffect, useCallback } from 'react';

// Polyfill for browser compatibility
// Fix: Correctly type window.SpeechRecognition and window.webkitSpeechRecognition.
// FIX: Renamed the constant to avoid a naming conflict with the `SpeechRecognition` interface.
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // Fix: Use the defined SpeechRecognition interface as the type for the ref.
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // FIX: Use the renamed constant to check for browser support.
    if (!SpeechRecognitionAPI) {
      console.error("Speech Recognition API is not supported in this browser.");
      return;
    }

    // FIX: Use the renamed constant to create a new instance.
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Fix: Use the defined SpeechRecognitionEvent interface for the event type.
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interimTranscript);
    };
    
    recognition.onend = () => {
        setIsListening(false);
    };
    
    // Fix: Use the defined SpeechRecognitionErrorEvent interface for the event type.
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const start = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  // FIX: Use the renamed constant for the `hasSupport` check.
  return { isListening, transcript, start, stop, hasSupport: !!SpeechRecognitionAPI };
};
