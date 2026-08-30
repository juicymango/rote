import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { SpeechSynthesisController } from "@/lib/speech/useSpeechSynthesis";
import SpeechButton from "../SpeechButton";

function makeController(
  overrides: Partial<SpeechSynthesisController> = {}
): SpeechSynthesisController {
  return {
    supported: true,
    hasJapaneseVoice: true,
    activeSpeechId: null,
    isSpeaking: false,
    error: null,
    speak: jest.fn(),
    stop: jest.fn(),
    ...overrides,
  };
}

describe("SpeechButton", () => {
  it("uses the configured label and sends its source id and text to the controller", () => {
    const controller = makeController();
    render(
      <SpeechButton
        speechId="key:1"
        label="Read key"
        text="相互"
        controller={controller}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Read key" }));

    expect(controller.speak).toHaveBeenCalledWith("key:1", "相互");
  });

  it("shows stop state and stops the active source", () => {
    const controller = makeController({ activeSpeechId: "value:1" });
    render(
      <SpeechButton
        speechId="value:1"
        label="Read value"
        text="日本語を読む。"
        controller={controller}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Stop reading" }));

    expect(controller.stop).toHaveBeenCalledTimes(1);
  });

  it("disables the value button when no complete sentence was extracted", () => {
    const controller = makeController();
    render(
      <SpeechButton
        speechId="value:1"
        label="Read value"
        text={null}
        controller={controller}
      />
    );

    expect(screen.getByRole("button", { name: "Read value" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      /no complete japanese sentence/i
    );
    expect(controller.speak).not.toHaveBeenCalled();
  });

  it("shows an unavailable message when speech synthesis is unsupported", () => {
    const controller = makeController({ supported: false });
    render(
      <SpeechButton
        speechId="key:1"
        label="Read key"
        text="相互"
        controller={controller}
      />
    );

    expect(screen.getByRole("button", { name: "Read key" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      /not available in this browser/i
    );
  });

  it("renders a compact icon button with an accessible label", () => {
    const controller = makeController();
    render(
      <SpeechButton
        compact
        speechId="key:1"
        label="Read key"
        text="相互"
        controller={controller}
      />
    );

    const button = screen.getByRole("button", { name: "Read key" });
    expect(button).toHaveClass("min-w-11");
    expect(button).toHaveAttribute("title", "Read key");
    expect(screen.getByText("Read key")).toHaveClass("sr-only");
  });
});
