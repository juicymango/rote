export interface DemoItem {
  id: string;
  key: string;
  value: string;
}

export const SAMPLE_ITEMS: DemoItem[] = [
  {
    id: "spaced-repetition",
    key: "What does spaced repetition optimize for?",
    value:
      "It schedules review close to the point where you are likely to forget, so each review strengthens long-term recall.",
  },
  {
    id: "active-recall",
    key: "What is active recall?",
    value:
      "Trying to remember an answer before looking at it. Retrieving the answer is the practice, not just rereading it.",
  },
  {
    id: "small-sessions",
    key: "Why keep review sessions small?",
    value:
      "A small daily queue is easier to finish consistently and gives the scheduler useful feedback about what you remember.",
  },
];
