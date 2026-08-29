import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SpeechButton from "@/components/ui/SpeechButton";
import useSpeechSynthesis from "../useSpeechSynthesis";

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

function SpeechHarness() {
  const controller = useSpeechSynthesis();

  return (
    <>
      <SpeechButton
        speechId="key:1"
        label="Read key"
        text="相互"
        controller={controller}
      />
      <SpeechButton
        speechId="value:1"
        label="Read value"
        text="相互理解を深める。"
        controller={controller}
      />
    </>
  );
}

describe("useSpeechSynthesis", () => {
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

  it("speaks the requested text with a Japanese voice", async () => {
    render(<SpeechHarness />);

    const keyButton = screen.getByRole("button", { name: "Read key" });
    await waitFor(() => expect(keyButton).toBeEnabled());

    fireEvent.click(keyButton);

    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.text).toBe("相互");
    expect(utterance.lang).toBe("ja-JP");
    expect(utterance.voice).toBe(japaneseVoice);
    expect(utterance.rate).toBe(0.9);
    expect(screen.getByRole("button", { name: "Stop reading" })).toBeInTheDocument();
  });

  it("shares one active source between key and value buttons", async () => {
    render(<SpeechHarness />);

    const keyButton = screen.getByRole("button", { name: "Read key" });
    await waitFor(() => expect(keyButton).toBeEnabled());

    fireEvent.click(keyButton);
    fireEvent.click(screen.getByRole("button", { name: "Read value" }));

    expect(cancel).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Read key" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop reading" })).toBeInTheDocument();
    expect(speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: "相互理解を深める。" }));
  });

  it("returns the active button to read state when speech ends", async () => {
    render(<SpeechHarness />);

    const keyButton = screen.getByRole("button", { name: "Read key" });
    await waitFor(() => expect(keyButton).toBeEnabled());
    fireEvent.click(keyButton);

    const utterance = speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    await act(async () => {
      utterance.onend?.({} as SpeechSynthesisEvent);
    });

    expect(screen.getByRole("button", { name: "Read key" })).toBeInTheDocument();
  });
});
