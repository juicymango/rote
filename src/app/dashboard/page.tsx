"use client";

import { useState, useEffect } from "react";

interface DashboardData {
  numContents: number;
  numRecitations: number;
  avgEf: number;
  progress: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      setData(data);
    };
    fetchData();
  }, []);

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Total Content</h2>
          <p className="text-3xl font-bold">{data.numContents}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Total Recitations</h2>
          <p className="text-3xl font-bold">{data.numRecitations}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Average Easiness Factor</h2>
          <p className="text-3xl font-bold">{data.avgEf.toFixed(2)}</p>
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-4">Recitation Progress</h2>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Content</th>
                <th className="text-left">Next Recite At</th>
                <th className="text-left">Easiness Factor</th>
              </tr>
            </thead>
            <tbody>
              {data.progress.map((p) => (
                <tr key={p.id}>
                  <td>{p.content.title}</td>
                  <td>{new Date(p.next_recite_at).toLocaleDateString()}</td>
                  <td>{p.ef.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
