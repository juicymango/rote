const JAPANESE_READING_PATTERN =
  /([一-龯々〆ヶ]+)[（(]([ぁ-ゖァ-ヿー・]+)[）)]/gu;

const EXAMPLE_LINE_PATTERN =
  /^\s*(?:[-*]\s*)?(?:\*\*)?(?:完整日语句子|完整句子|日语例句|例句)(?:\*\*)?\s*[：:]\s*(.+?)\s*$/u;

/** Remove visual furigana and card-only labels before handing text to TTS. */
export function cleanSpeechText(text: string): string {
  return text
    .replace(JAPANESE_READING_PATTERN, "$1")
    .replace(/【[^】\r\n]*】/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Find the Japanese example sentence stored in a structured card value. */
export function extractJapaneseExample(value: string): string | null {
  for (const line of value.split(/\r?\n/u)) {
    const match = line.match(EXAMPLE_LINE_PATTERN);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Select speech-safe text without reading the mixed Chinese/Japanese study notes.
 * Vocabulary uses its clean key; grammar cards use their complete Japanese example.
 */
export function extractSpeechText(key: string, value: string): string {
  const example = extractJapaneseExample(value);
  const isGrammar = /^\s*【文法】/u.test(key);
  const source = (isGrammar && example) || key || example || "";
  return cleanSpeechText(source);
}
