import {
  cleanSpeechText,
  extractJapaneseExample,
  extractSpeechText,
} from "../speechText";

describe("speech text extraction", () => {
  it("uses the clean key for vocabulary cards", () => {
    expect(
      extractSpeechText(
        "相互",
        "假名：そうご\n中文解释：相互、彼此\n完整日语句子：相互理解を深める。"
      )
    ).toBe("相互");
  });

  it("uses a grammar example and removes visual furigana", () => {
    const value =
      "接续：名词\n完整日语句子：これからも様々（さまざま）な国（くに）との相互（そうご）理解（りかい）を深（ふか）めていこうと思（おも）う。\n句子翻译：今后也会加深与各国的相互理解。";

    expect(extractSpeechText("【文法】〜と思う", value)).toBe(
      "これからも様々な国との相互理解を深めていこうと思う。"
    );
  });

  it("supports half-width reading parentheses without removing normal parentheses", () => {
    expect(cleanSpeechText("漢字(かんじ)を読む（練習）。")).toBe(
      "漢字を読む（練習）。"
    );
  });

  it("falls back to a cleaned key when a grammar example is missing", () => {
    expect(extractSpeechText("【文法】〜に応じて", "中文解释：根据、按照")).toBe(
      "〜に応じて"
    );
  });

  it("extracts supported example labels", () => {
    expect(extractJapaneseExample("例句：日本語を勉強します。\n翻译：学习日语。")).toBe(
      "日本語を勉強します。"
    );
  });
});
