"use client";

import { useEffect } from "react";
import useSpeechSynthesis from "@/lib/speech/useSpeechSynthesis";

interface SpeechButtonProps {
  text: string;
}

export default function SpeechButton({ text }: SpeechButtonProps) {
  const { supported, hasJapaneseVoice, isSpeaking, error, speak, stop } =
    useSpeechSynthesis();

  // Stop before a different card's text can be spoken and when this card leaves the DOM.
  useEffect(() => () => stop(), [text, stop]);

  const unavailableMessage = !supported
    ? "Speech is not available in this browser."
    : hasJapaneseVoice === false
      ? "No Japanese voice found; the browser default will be used."
      : null;
  const disabled = !supported || text.trim().length === 0;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => (isSpeaking ? stop() : speak(text))}
        disabled={disabled}
        aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
        aria-pressed={isSpeaking}
        title={unavailableMessage ?? undefined}
        className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSpeaking ? "Stop" : "Read aloud"}
      </button>
      {unavailableMessage && (
        <span className="max-w-48 text-right text-xs text-gray-500" role="status">
          {unavailableMessage}
        </span>
      )}
      {error && (
        <span className="max-w-48 text-right text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
