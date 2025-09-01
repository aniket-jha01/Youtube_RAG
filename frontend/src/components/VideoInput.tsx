// src/components/VideoInput.tsx
import React, { useState } from "react";
import { ingestVideo, IngestResponse } from "../lib/api";

interface Props {
  onIngested: (data: IngestResponse) => void;
}

export default function VideoInput({ onIngested }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleIngest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ingestVideo(url);
      onIngested(data); // pass thread_id + metadata back to parent
    } catch (err: any) {
      setError(err.message || "Failed to ingest video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Paste YouTube URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full rounded-lg border px-3 py-2"
      />
      <button
        onClick={handleIngest}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
