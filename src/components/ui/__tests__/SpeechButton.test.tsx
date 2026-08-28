import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SpeechButton from "../SpeechButton";

class MockSpeechSynthesisUtterance {
  text: string;
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: ((event: SpeechSynthesisEvent) => void) | null = null;
  onend: ((event: SpeechSynthesisEvent) => void) | null = null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

describe("SpeechButton", () => {
  const japaneseVoice = {
    lang: "ja-JP",
    name: "Test Japanese",
  } as SpeechSynthesisVoice;
  const speak = jest.fn();
  const cancel = jest.fn();
  const getVoices = jest.fn(() => [japaneseVoice]);
  const addEventListener = jest.fn();
  const removeEventListener = jest.fn();
  const synthesis = {
    speak,
    cancel,
    getVoices,
    addEventListener,
    removeEventListener,
  } as unknown as SpeechSynthesis;

  let originalSynthesis: PropertyDescriptor | undefined;
  let originalUtterance: PropertyDescriptor | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalSynthesis = Object.getOwnPropertyDescriptor(window, "speechSynthesis");
    originalUtterance = Object.getOwnPropertyDescriptor(
      window,
      "SpeechSynthesisUtterance"
    );
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: synthesis,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });
  });

  afterEach(() => {
    if (originalSynthesis) {
      Object.defineProperty(window, "speechSynthesis", originalSynthesis);
    } else {
      delete (window as Window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
    }
    if (originalUtterance) {
      Object.defineProperty(window, "SpeechSynthesisUtterance", originalUtterance);
    } else {
      delete (window as Window & { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance })
        .SpeechSynthesisUtterance;
    }
  });

  it("speaks Japanese text with the preferred voice and beginner-friendly rate", async () => {
    render(<SpeechButton text="相互" />);

    const button = screen.getByRole("button", { name: /read aloud/i });
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);

    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.text).toBe("相互");
    expect(utterance.lang).toBe("ja-JP");
    expect(utterance.voice).toBe(japaneseVoice);
    expect(utterance.rate).toBe(0.9);
    expect(screen.getByRole("button", { name: /stop reading/i })).toBeInTheDocument();
  });

  it("cancels the active utterance when stopped or when the text changes", async () => {
    const { rerender } = render(<SpeechButton text="相互" />);
    const button = screen.getByRole("button", { name: /read aloud/i });
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: /stop reading/i }));
    expect(cancel).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: /read aloud/i }));
    await act(async () => rerender(<SpeechButton text="理解" />));
    expect(cancel).toHaveBeenCalledTimes(4);
  });

  it("returns to the read state after the utterance ends", async () => {
    render(<SpeechButton text="相互" />);
    const button = screen.getByRole("button", { name: /read aloud/i });
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);
    const utterance = speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    await act(async () => {
      utterance.onend?.({} as SpeechSynthesisEvent);
    });

    expect(screen.getByRole("button", { name: /read aloud/i })).toBeInTheDocument();
  });
});
