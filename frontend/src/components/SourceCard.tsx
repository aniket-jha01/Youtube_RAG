import { ExternalLink, Clock } from "lucide-react";
import { formatTimestamp, createTimestampUrl } from "@/lib/api";

interface Source {
  snippet: string;
  timestamp: number;
  video_url: string;
}

interface SourceCardProps {
  sources: Source[];
  className?: string;
}

export function SourceCard({ sources, className }: SourceCardProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className={`mt-3 space-y-2 ${className || ''}`}>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Sources
      </h4>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <div
            key={index}
            className="bg-source-card text-source-card-foreground rounded-xl p-3 shadow-soft border border-border/50 hover:shadow-medium transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed text-source-card-foreground/90 mb-2">
                  {source.snippet}
                </p>
                <div className="flex items-center gap-2 text-xs text-source-card-foreground/70">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimestamp(source.timestamp)}</span>
                </div>
              </div>
              <a
                href={createTimestampUrl(source.video_url, source.timestamp)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-2 rounded-lg bg-source-card-foreground/10 hover:bg-source-card-foreground/20 transition-colors duration-200"
                title="Jump to timestamp in video"
              >
                <ExternalLink className="w-4 h-4 text-source-card-foreground/70" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}