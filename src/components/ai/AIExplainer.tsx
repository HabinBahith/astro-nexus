import { Brain, Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  "What causes solar flares?",
  "How fast does the ISS travel?",
  "Explain the KP Index",
  "What is a geomagnetic storm?",
  "How do astronauts train?",
];

export const AIExplainer = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm AstroNexus AI, your space science companion. Ask me anything about astronomy, space missions, or the data you see on this dashboard. I'll explain complex concepts in simple terms.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const replicateApiKey = import.meta.env.VITE_REPLICATE_API_KEY;
      if (!replicateApiKey) {
        throw new Error("Replicate API key not configured");
      }

      // Use Replicate's chat completion endpoint
      const res = await fetch("https://api.replicate.com/v1/models/meta/meta-llama-3-70b-instruct/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${replicateApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            prompt: `You are AstroNexus AI, a space science expert. Answer this question about space, astronomy, or space missions in a clear and engaging way (max 300 words): ${input}`,
            max_new_tokens: 500,
            temperature: 0.7,
            top_p: 0.9,
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Replicate API error: ${res.status} - ${errorText}`);
      }

      const prediction = await res.json();
      
      // Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds timeout
      
      while (!completed && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const statusRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: { "Authorization": `Token ${replicateApiKey}` },
        });
        
        if (!statusRes.ok) {
          throw new Error(`Failed to check prediction status: ${statusRes.status}`);
        }
        
        const statusData = await statusRes.json();
        
        if (statusData.status === "succeeded") {
          const output = statusData.output;
          const content = Array.isArray(output) 
            ? output.join("") 
            : typeof output === "string" 
              ? output 
              : "I couldn't generate a response. Please try again.";
          
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: content.trim() || "I couldn't generate a response. Please try again.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          completed = true;
        } else if (statusData.status === "failed" || statusData.status === "canceled") {
          throw new Error(statusData.error || "Prediction failed");
        }
        attempts++;
      }

      if (!completed) {
        throw new Error("Request timed out after 60 seconds");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorMessage.includes("API key")
          ? "Replicate API key not configured. Please set VITE_REPLICATE_API_KEY in your environment variables."
          : `I couldn't fetch a response right now: ${errorMessage}. Please try again in a moment.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = (question: string) => {
    setInput(question);
  };

  return (
    <section className="glass-panel p-6 h-[600px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-alert-magenta/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-alert-magenta" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold tracking-wide">
              ASK ASTRONEXUS
            </h2>
            <p className="text-xs text-muted-foreground">
              AI-Powered Space Science Explainer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-alert-magenta" />
          <span className="text-xs text-muted-foreground">Powered by AI</span>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {suggestedQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSuggestion(q)}
            className="text-xs px-3 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-4 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-alert-magenta" />
                  <span className="text-xs font-display text-alert-magenta">
                    AstroNexus AI
                  </span>
                </div>
              )}
              <div className="text-sm whitespace-pre-line">{message.content}</div>
              <span
                className={`text-[10px] mt-2 block ${
                  message.role === "user"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary/50 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-alert-magenta" />
                <span className="text-sm text-muted-foreground">
                  Analyzing your question...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask anything about space..."
          className="flex-1 bg-secondary/50 border-border/50"
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </section>
  );
};
