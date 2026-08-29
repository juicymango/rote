import {
  cleanSpeechText,
  extractKeySpeechText,
  extractValueSpeechText,
} from "../speechText";

describe("speech text extraction", () => {
  it("uses the complete key as the key speech source", () => {
    expect(extractKeySpeechText("相互理解")).toBe("相互理解");
    expect(extractKeySpeechText("【文法】〜と思う")).toBe("〜と思う");
  });

  it("extracts only the complete Japanese sentence from value", () => {
    const value =
      "接续：名词\n完整日语句子：これからも様々（さまざま）な国（くに）との相互（そうご）理解（りかい）を深（ふか）めていこうと思（おも）う。\n句子翻译：今后也会加深与各国的相互理解。";

    expect(extractValueSpeechText(value)).toBe(
      "これからも様々な国との相互理解を深めていこうと思う。"
    );
  });

  it("supports a multi-line complete sentence and stops at the next field", () => {
    const value =
      "内容类型：词汇\n完整日语句子：\n漢字（かんじ）を読む。\n毎日（まいにち）練習（れんしゅう）する。\n句子翻译：每天练习。";

    expect(extractValueSpeechText(value)).toBe("漢字を読む。 毎日練習する。");
  });

  it("returns null when value has no complete Japanese sentence", () => {
    expect(extractValueSpeechText("假名：そうご\n中文解释：相互、彼此")).toBeNull();
  });

  it("supports half-width reading parentheses without removing normal parentheses", () => {
    expect(cleanSpeechText("漢字(かんじ)を読む（練習）。")).toBe(
      "漢字を読む（練習）。"
    );
  });
});
