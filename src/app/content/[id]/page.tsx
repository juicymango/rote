"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface Content {
  id: string;
  title: string;
  body: string;
}

export default function ContentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [content, setContent] = useState<Content | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const fetchContent = async () => {
      const res = await fetch(`/api/content/${params.id}`);
      const data = await res.json();
      setContent(data);
      setTitle(data.title);
      setBody(data.body);
    };
    fetchContent();
  }, [params.id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/content/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body }),
    });
    const data = await res.json();
    setContent(data);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await fetch(`/api/content/${params.id}`, {
      method: "DELETE",
    });
    router.push("/content");
  };

  if (!content) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      {isEditing ? (
        <form onSubmit={handleUpdate}>
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
          <Button type="submit">Update</Button>
          <Button onClick={() => setIsEditing(false)} className="ml-2">Cancel</Button>
        </form>
      ) : (
        <div>
          <h1 className="text-3xl font-bold mb-4">{content.title}</h1>
          <p className="text-gray-700 mb-6">{content.body}</p>
          <Button onClick={() => setIsEditing(true)}>Edit</Button>
          <Button onClick={handleDelete} className="ml-2 bg-red-600 hover:bg-red-700">Delete</Button>
        </div>
      )}
    </div>
  );
}
