"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { findJapaneseVoice } from "./voices";

interface SpeechEnvironment {
  synthesis: SpeechSynthesis;
  Utterance: typeof SpeechSynthesisUtterance;
}

function getSpeechEnvironment(): SpeechEnvironment | null {
  if (typeof window === "undefined") return null;

  const synthesis = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance;
  if (!synthesis || typeof Utterance !== "function") return null;

  return { synthesis, Utterance };
}

interface UseSpeechSynthesisResult {
  supported: boolean;
  hasJapaneseVoice: boolean | null;
  isSpeaking: boolean;
  error: string | null;
  speak: (text: string) => void;
  stop: () => void;
}

export default function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const supported = useSyncExternalStore(
    () => () => undefined,
    () => getSpeechEnvironment() !== null,
    () => false
  );
  const [hasJapaneseVoice, setHasJapaneseVoice] = useState<boolean | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const environment = getSpeechEnvironment();
    if (!environment) return;

    const updateVoices = () => {
      const voices = environment.synthesis.getVoices();
      // Some browsers populate voices asynchronously after the first render.
      if (voices.length === 0) {
        setHasJapaneseVoice(null);
        return;
      }
      setHasJapaneseVoice(Boolean(findJapaneseVoice(voices)));
    };

    updateVoices();
    environment.synthesis.addEventListener("voiceschanged", updateVoices);

    return () => {
      activeUtteranceRef.current = null;
      environment.synthesis.removeEventListener("voiceschanged", updateVoices);
      environment.synthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    activeUtteranceRef.current = null;
    getSpeechEnvironment()?.synthesis.cancel();
    setIsSpeaking(false);
    setError(null);
  }, []);

  const speak = useCallback((text: string) => {
    const environment = getSpeechEnvironment();
    const speechText = text.trim();

    if (!environment) {
      setError("Speech is not available in this browser.");
      setIsSpeaking(false);
      return;
    }
    if (!speechText) {
      setError("There is no text to read.");
      setIsSpeaking(false);
      return;
    }

    // Clear the active reference before cancel so an old end event cannot
    // change the state of a newly started utterance.
    activeUtteranceRef.current = null;
    environment.synthesis.cancel();

    let utterance: SpeechSynthesisUtterance;
    try {
      utterance = new environment.Utterance(speechText);
      utterance.lang = "ja-JP";
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voice = findJapaneseVoice(environment.synthesis.getVoices());
      if (voice) utterance.voice = voice;
    } catch {
      setError("Japanese pronunciation could not be started.");
      setIsSpeaking(false);
      return;
    }

    const finish = () => {
      if (activeUtteranceRef.current !== utterance) return;
      activeUtteranceRef.current = null;
      setIsSpeaking(false);
    };

    utterance.onstart = () => {
      if (activeUtteranceRef.current === utterance) setIsSpeaking(true);
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    activeUtteranceRef.current = utterance;
    setError(null);
    setIsSpeaking(true);

    try {
      environment.synthesis.speak(utterance);
    } catch {
      finish();
      setError("Japanese pronunciation could not be started.");
    }
  }, []);

  return { supported, hasJapaneseVoice, isSpeaking, error, speak, stop };
}
