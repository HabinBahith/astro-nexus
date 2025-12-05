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

    // Simulate AI response (in production, connect to Lovable AI)
    setTimeout(() => {
      const responses: Record<string, string> = {
        "solar flares": `Solar flares are sudden, intense bursts of radiation from the Sun's surface. They occur when magnetic energy built up in the solar atmosphere is suddenly released. 

**Key facts:**
• Temperature can reach millions of degrees
• Travel at the speed of light (8 minutes to Earth)
• Classified by power: A, B, C, M, and X classes
• X-class flares are the most powerful

They can affect radio communications, GPS systems, and create beautiful auroras when they interact with Earth's magnetic field.`,
        "iss travel": `The International Space Station (ISS) travels at an incredible **27,600 km/h** (17,150 mph)!

**Orbital stats:**
• Completes one orbit every ~92 minutes
• That's 16 sunrises and sunsets per day
• Orbits at ~400 km altitude
• Travels ~8 km per second

At this speed, astronauts experience microgravity because they're in constant freefall around Earth. The station has traveled over 4 billion kilometers since launch!`,
        "kp index": `The KP Index (Planetary K-index) measures global geomagnetic activity on a scale of **0-9**.

**Scale breakdown:**
• **0-3**: Quiet — Normal conditions
• **4-5**: Active — Minor storm, possible aurora at high latitudes  
• **6-7**: Storm — Aurora visible at mid-latitudes, possible GPS issues
• **8-9**: Severe — Aurora at low latitudes, power grid concerns

It's updated every 3 hours and is crucial for aurora hunters, satellite operators, and power grid managers. Higher KP = better aurora viewing!`,
        default: `That's a fascinating question about space! While I'm currently demonstrating with pre-set responses, when fully connected to Lovable AI, I'll be able to provide detailed explanations on any astronomy or space science topic.

Try asking about:
• Solar phenomena (flares, wind, CMEs)
• ISS and satellite tracking
• Space weather impacts
• Mission details and rocket technology`,
      };

      const key = Object.keys(responses).find((k) =>
        input.toLowerCase().includes(k)
      );
      const responseContent = responses[key || "default"];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
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
