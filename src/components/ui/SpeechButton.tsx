"use client";

import type { SpeechSynthesisController } from "@/lib/speech/useSpeechSynthesis";

interface SpeechButtonProps {
  text: string | null;
  speechId: string;
  label: string;
  controller: SpeechSynthesisController;
  compact?: boolean;
}

export default function SpeechButton({
  text,
  speechId,
  label,
  controller,
  compact = false,
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
  const accessibleLabel = isSpeaking ? "Stop reading" : label;
  const wrapperClassName = compact
    ? "flex min-w-0 flex-col items-start gap-1"
    : "flex shrink-0 flex-col items-end gap-1";
  const buttonClassName = compact
    ? "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 p-2 text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
    : "rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className={wrapperClassName}>
      <button
        type="button"
        onClick={() => (isSpeaking ? stop() : speak(speechId, text ?? ""))}
        disabled={disabled}
        aria-label={accessibleLabel}
        aria-pressed={isSpeaking}
        title={isSpeaking ? "Stop reading" : unavailableMessage ?? label}
        className={buttonClassName}
      >
        {compact ? (
          isSpeaking ? (
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 5 6 9H2v6h4l5 4V5Z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )
        ) : isSpeaking ? (
          "Stop"
        ) : (
          label
        )}
        {compact && <span className="sr-only">{accessibleLabel}</span>}
      </button>
      {unavailableMessage && (
        <span
          className={`max-w-48 text-xs text-gray-500 ${compact ? "text-left" : "text-right"}`}
          role="status"
        >
          {unavailableMessage}
        </span>
      )}
      {error && (isSpeaking || activeSpeechId === null) && (
        <span
          className={`max-w-48 text-xs text-red-600 ${compact ? "text-left" : "text-right"}`}
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}
