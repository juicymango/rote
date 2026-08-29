"use client";

import type { SpeechSynthesisController } from "@/lib/speech/useSpeechSynthesis";

interface SpeechButtonProps {
  text: string | null;
  speechId: string;
  label: string;
  controller: SpeechSynthesisController;
}

export default function SpeechButton({
  text,
  speechId,
  label,
  controller,
}: SpeechButtonProps) {
  const {
    supported,
    hasJapaneseVoice,
    activeSpeechId,
    error,
    speak,
    stop,
  } = controller;
  const isSpeaking = activeSpeechId === speechId;

  const unavailableMessage = !supported
    ? "Speech is not available in this browser."
    : hasJapaneseVoice === false
      ? "No Japanese voice found; the browser default will be used."
      : text === null
        ? "No complete Japanese sentence found."
        : null;
  const disabled = !supported || text === null || text.trim().length === 0;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => (isSpeaking ? stop() : speak(speechId, text ?? ""))}
        disabled={disabled}
        aria-label={isSpeaking ? "Stop reading" : label}
        aria-pressed={isSpeaking}
        title={unavailableMessage ?? undefined}
        className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSpeaking ? "Stop" : label}
      </button>
      {unavailableMessage && (
        <span className="max-w-48 text-right text-xs text-gray-500" role="status">
          {unavailableMessage}
        </span>
      )}
      {error && (isSpeaking || activeSpeechId === null) && (
        <span className="max-w-48 text-right text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
