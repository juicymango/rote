"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

interface Content {
  id: string;
  title: string;
}

export default function ContentPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [content, setContent] = useState<Content[]>([]);

  useEffect(() => {
    const fetchContent = async () => {
      const res = await fetch("/api/content");
      const data = await res.json();
      setContent(data);
    };
    fetchContent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/content", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body }),
    });
    const data = await res.json();
    setContent([...content, data]);
    setTitle("");
    setBody("");
  };

  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">Content</h1>
      <div className="bg-white p-8 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold mb-4">Create New Content</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <Button type="submit">Create</Button>
        </form>
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-4">Your Content</h2>
        <ul className="space-y-4">
          {content.map((item) => (
            <li key={item.id} className="bg-white p-4 rounded-lg shadow-md">
              <Link href={`/content/${item.id}`} className="text-xl font-bold text-indigo-600 hover:underline">{item.title}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}