"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseMarkdownToItems, ParsedItem } from "@/lib/items/parseMarkdown";

type Step = "paste" | "review" | "done";

export default function BulkImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("paste");
  const [markdown, setMarkdown] = useState("");
  const [parsed, setParsed] = useState<ParsedItem[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleParse() {
    const items = parseMarkdownToItems(markdown);
    setParsed(items);
    setStep("review");
  }

  async function handleConfirm() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsed }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setError(msg || "Import failed.");
        return;
      }
      const data = await res.json();
      setImportedCount(data.count ?? parsed.length);
      setStep("done");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Import Complete</h1>
          <p className="text-gray-600 mb-6">
            {importedCount} item{importedCount !== 1 ? "s" : ""} imported successfully.
          </p>
          <Link
            href="/items"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
          >
            View Items
          </Link>
        </div>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Import</h1>
          <p className="text-gray-600 mb-6">
            {parsed.length} item{parsed.length !== 1 ? "s" : ""} found.
          </p>

          {error && (
            <p className="text-red-600 text-sm mb-4" role="alert">
              {error}
            </p>
          )}

          {parsed.length === 0 ? (
            <p className="text-gray-500 mb-6">
              No items could be parsed. Make sure your markdown has H1 headings (# Heading).
            </p>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 w-1/3">Key</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-2 font-medium text-gray-900 truncate max-w-xs">
                        {item.key}
                      </td>
                      <td className="px-4 py-2 text-gray-600 truncate max-w-xs">
                        {item.value.slice(0, 80)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("paste")}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            >
              Back
            </button>
            {parsed.length > 0 && (
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium disabled:opacity-50 min-h-11"
              >
                {submitting ? "Importing..." : "Confirm Import"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // step === "paste"
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/items" className="text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Import</h1>
        </div>

        <p className="text-gray-600 mb-4 text-sm">
          Paste a markdown document below. Each{" "}
          <code className="bg-gray-100 px-1 rounded"># Heading</code> becomes a key,
          and its body becomes the value.
        </p>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label htmlFor="markdown" className="block text-sm font-medium text-gray-700 mb-1">
              Paste Markdown
            </label>
            <textarea
              id="markdown"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              placeholder={"# Question One\nAnswer content here.\n\n# Question Two\nMore content."}
            />
          </div>

          <button
            onClick={handleParse}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium min-h-11"
          >
            Parse
          </button>
        </div>
      </div>
    </div>
  );
}
