/** Prefer a Japan-specific voice, then fall back to any Japanese voice. */
export function findJapaneseVoice(
  voices: readonly SpeechSynthesisVoice[]
): SpeechSynthesisVoice | undefined {
  return (
    voices.find((voice) => voice.lang.trim().toLowerCase() === "ja-jp") ??
    voices.find((voice) => voice.lang.trim().toLowerCase().startsWith("ja"))
  );
}
