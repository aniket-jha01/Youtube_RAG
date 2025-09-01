const API_BASE = import.meta.env.VITE_API_BASE || 'https://yt-rag-backend.onrender.com';

export interface IngestResponse {
  thread_id: string;
  video_id: string;
  message?: string;
}

export interface ChatResponse {
  message: string;
  sources?: Array<{
    snippet: string;
    timestamp: number;
    video_url: string;
  }>;
}

export interface ChatRequest {
  thread_id: string;
  message: string;
}

export async function ingestVideo(url: string): Promise<IngestResponse> {
  const response = await fetch(`${API_BASE}/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(`Failed to ingest video: ${response.statusText}`);
  }

  return response.json();
}

export async function sendChatMessage(data: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to send chat message: ${response.statusText}`);
  }

  return response.json();
}

export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function createTimestampUrl(videoUrl: string, seconds: number): string {
  const url = new URL(videoUrl);
  url.searchParams.set('t', `${Math.floor(seconds)}s`);
  return url.toString();
}