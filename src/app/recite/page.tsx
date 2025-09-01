"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";

interface Content {
  id: string;
  title: string;
  body: string;
}

export default function RecitePage() {
  const [content, setContent] = useState<Content[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      const res = await fetch("/api/recite/today");
      const data = await res.json();
      setContent(data);
    };
    fetchContent();
  }, []);

  const handleRate = async (q: number) => {
    await fetch(`/api/recite/${content[currentIndex].id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q }),
      }
    );
    setShowAnswer(false);
    setCurrentIndex(currentIndex + 1);
  };

  if (content.length === 0) {
    return <div>No content to recite today.</div>;
  }

  if (currentIndex >= content.length) {
    return <div>You have recited all the content for today.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">Recite</h1>
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">{content[currentIndex].title}</h2>
        {showAnswer ? (
          <div>
            <p className="text-gray-700 mb-6">{content[currentIndex].body}</p>
            <div className="flex justify-between">
              {[0, 1, 2, 3, 4, 5].map((q) => (
                <Button key={q} onClick={() => handleRate(q)}>{q}</Button>
              ))}
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowAnswer(true)}>Show Answer</Button>
        )}
      </div>
    </div>
  );
}
