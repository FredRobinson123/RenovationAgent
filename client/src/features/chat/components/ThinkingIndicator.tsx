import { useEffect, useState } from "react";

const thinkingMessages = [
  "Gathering inspiration…",
  "Sketching your space…",
  "Adjusting the details…",
  "Wrapping up your plan…",
];

export function ThinkingIndicator() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % thinkingMessages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start" data-testid="thinking-indicator">
      <div className="max-w-[85%] rounded-2xl p-4 bg-muted">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-sm transition-opacity duration-300">
            {thinkingMessages[messageIndex]}
          </span>
        </div>
      </div>
    </div>
  );
}
