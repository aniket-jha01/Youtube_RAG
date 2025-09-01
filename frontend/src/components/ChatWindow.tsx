import React, { useState } from "react";
import { ingestVideo, sendChatMessage, ChatResponse } from "../api";
import ChatMessage from "./ChatMessage";
import SourceCard from "./SourceCard";

export default function ChatWindow() {
  const [videoUrl, setVideoUrl] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "bot"; message: string }[]
  >([]);
  const [sources, setSources] = useState<ChatResponse["sources"]>([]);
  const [loading, setLoading] = useState(false);

  const handleIngest = async () => {
    try {
      setLoading(true);
      const res = await ingestVideo(videoUrl);
      setThreadId(res.thread_id);
      setMessages((prev) => [
        ...prev,
        { role: "bot", message: "Video ingested successfully! 🎬 You can now ask questions." },
      ]);
    } catch (err: any) {
      alert(err.message || "Failed to ingest video");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (msg: string) => {
    if (!threadId) {
      alert("Please ingest a video first.");
      return;
    }
    setMessages((prev) => [...prev, { role: "user", message: msg }]);
    setLoading(true);

    try {
      const res = await sendChatMessage({ thread_id: threadId, message: msg });
      setMessages((prev) => [...prev, { role: "bot", message: res.message }]);
      setSources(res.sources || []);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", message: "❌ Error: " + (err.message || "Chat failed") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-4">
      {/* Video Input */}
      <div className="flex mb-4">
        <input
          type="text"
          className="flex-grow border p-2 rounded-l"
          placeholder="Paste YouTube URL..."
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-4 rounded-r"
          onClick={handleIngest}
          disabled={loading}
        >
          {loading ? "Loading..." : "Analyze"}
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 border rounded p-4 overflow-y-auto space-y-2 mb-4">
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} message={m.message} />
        ))}
        {loading && <p className="text-gray-400">Thinking...</p>}
      </div>

      {/* Message Input */}
      <div className="flex">
        <input
          type="text"
          className="flex-grow border p-2 rounded-l"
          placeholder="Ask something about the video..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value.trim()) {
              handleSend(e.currentTarget.value.trim());
              e.currentTarget.value = "";
            }
          }}
        />
        <button
          className="bg-green-500 text-white px-4 rounded-r"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>(
              "input[placeholder='Ask something about the video...']"
            );
            if (input && input.value.trim()) {
              handleSend(input.value.trim());
              input.value = "";
            }
          }}
          disabled={loading}
        >
          Send
        </button>
      </div>

      {/* Sources */}
      {sources && sources.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="font-semibold">Sources</h3>
          {sources.map((s, i) => (
            <SourceCard
              key={i}
              snippet={s.snippet}
              timestamp={s.timestamp}
              video_url={s.video_url}
            />
          ))}
        </div>
      )}
    </div>
  );
}
