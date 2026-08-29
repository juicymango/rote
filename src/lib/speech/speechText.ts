const JAPANESE_READING_PATTERN =
  /([一-龯々〆ヶ]+)[（(]([ぁ-ゖァ-ヿー・]+)[）)]/gu;

const COMPLETE_SENTENCE_LINE_PATTERN =
  /^\s*(?:[-*]\s*)?(?:\*\*)?完整日语句子(?:\*\*)?\s*[：:]\s*(.*)\s*$/u;

const FIELD_HEADER_PATTERN =
  /^\s*(?:[-*]\s*)?(?:\*\*)?[^：:\n]{1,30}(?:\*\*)?\s*[：:]/u;

/** Remove visual furigana and card-only labels before handing text to TTS. */
export function cleanSpeechText(text: string): string {
  return text
    .replace(JAPANESE_READING_PATTERN, "$1")
    .replace(/【[^】\r\n]*】/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Return the key itself as the key button's speech source. */
export function extractKeySpeechText(key: string): string {
  return cleanSpeechText(key);
}

/** Extract only the complete Japanese sentence field from a structured value. */
export function extractValueSpeechText(value: string): string | null {
  const lines = value.split(/\r?\n/u);
  const startIndex = lines.findIndex((line) =>
    COMPLETE_SENTENCE_LINE_PATTERN.test(line)
  );
  if (startIndex < 0) return null;

  const firstLine = lines[startIndex].match(COMPLETE_SENTENCE_LINE_PATTERN);
  if (!firstLine) return null;

  const sentenceLines = [firstLine[1].trim()];
  for (const line of lines.slice(startIndex + 1)) {
    if (FIELD_HEADER_PATTERN.test(line)) break;
    if (line.trim()) sentenceLines.push(line.trim());
  }

  const sentence = cleanSpeechText(sentenceLines.join(" "));
  return sentence || null;
}
