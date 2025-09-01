import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Youtube, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ingestVideo } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "Please enter a URL",
        description: "You need to provide a YouTube URL to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      toast({
        title: "Invalid YouTube URL",
        description: "Please enter a valid YouTube video URL.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await ingestVideo(url);
      
      // Clear any existing chat history
      localStorage.removeItem('youtube_chat_history');
      
      toast({
        title: "Video analyzed successfully!",
        description: "You can now start asking questions about the video.",
      });

      navigate('/chat', {
        state: {
          thread_id: response.thread_id,
          video_id: response.video_id,
        },
      });
    } catch (error) {
      console.error('Error ingesting video:', error);
      toast({
        title: "Analysis failed",
        description: "Failed to analyze the video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-slide-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-6 shadow-large">
            <Youtube className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            YouTube Q&A Bot
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Paste any YouTube link and start asking questions about the video content.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-card rounded-3xl shadow-large border border-border/50 overflow-hidden">
          <div className="p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <label 
                  htmlFor="youtube-url" 
                  className="block text-sm font-medium text-foreground"
                >
                  YouTube Video URL
                </label>
                <Input
                  id="youtube-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={isLoading}
                  className="h-14 text-base rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="w-full h-14 text-base font-semibold rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground shadow-medium hover:shadow-large transition-all duration-300 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Video...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    Analyze Video
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </Button>
            </form>

            {/* Features */}
            <div className="mt-8 pt-8 border-t border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mx-auto">
                    <Youtube className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-medium text-foreground">Any Video</h3>
                  <p className="text-sm text-muted-foreground">
                    Works with any public YouTube video
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                    <ArrowRight className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-medium text-foreground">Instant Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    AI processes the content in seconds
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mx-auto">
                    <Loader2 className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-medium text-foreground">Smart Answers</h3>
                  <p className="text-sm text-muted-foreground">
                    Get answers with timestamp sources
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Powered by AI • Analyze any YouTube video instantly
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
