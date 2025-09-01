// frontend/src/lib/api.ts

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// ---------- Types ----------
export interface IngestResponse {
  thread_id: string;
  video_id: string;
  title?: string | null;
  url: string;
  language?: string | null;
  chunks: number;
}

export interface Source {
  text: string;
  start: number;
  end: number;
  ts_label: string;
  url: string;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
}

export interface ChatRequest {
  thread_id: string;
  message: string;
  k?: number;
}

// ---------- API Calls ----------
export async function ingestVideo(url: string, language?: string): Promise<IngestResponse> {
  try {
    const response = await fetch(`${API_BASE}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, language }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to ingest video (${response.status}): ${errText}`);
    }

    return response.json();
  } catch (error: any) {
    console.error("ingestVideo error:", error);
    throw error;
  }
}

export async function sendChatMessage(data: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to send chat message (${response.status}): ${errText}`);
    }

    return response.json();
  } catch (error: any) {
    console.error("sendChatMessage error:", error);
    throw error;
  }
}

// ---------- Helpers ----------
export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m}:${s.toString().padStart(2, "0")}`;
}

export function createTimestampUrl(videoUrl: string, seconds: number): string {
  const url = new URL(videoUrl);
  url.searchParams.set("t", `${Math.floor(seconds)}s`);
  return url.toString();
}
