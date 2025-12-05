import { useState, useEffect, useRef } from "react";

// ⬇️ Change this if backend runs on another IP
const BACKEND_URL = "http://172.20.10.4:8000/command";

function App() {
  const [messages, setMessages] = useState([
    {
      from: "jarvis",
      text: "Hey, I'm Jarvis. Tell me what to do and I’ll try to make your desktop obey.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 🔥 Ctrl+Space (or Cmd+Space) shortcut to start listening
  useEffect(() => {
    const handleGlobalKey = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd && e.code === "Space") {
        e.preventDefault();
        handleVoiceClick();
      }
    };

    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    setInput("");

    const now = new Date();

    setMessages((prev) => [
      ...prev,
      { from: "you", text: userText, timestamp: now },
    ]);
    setIsLoading(true);

    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userText }), // backend expects "text"
      });

      const data = await res.json();
      console.log("Response JSON:", data);

      const replyTime = new Date();
      const jarvisMsgs = [];

      const primaryText =
        (typeof data === "string" && data) ||
        data.text ||
        data.message ||
        data.result ||
        data.spoken_response;

      if (primaryText) {
        jarvisMsgs.push({
          from: "jarvis",
          text: primaryText,
          timestamp: replyTime,
        });
      }

      const logs = data.logs || data.steps || data.plan;
      if (Array.isArray(logs)) {
        logs.forEach((log) => {
          jarvisMsgs.push({
            from: "jarvis",
            text: String(log),
            timestamp: new Date(),
          });
        });
      }

      if (jarvisMsgs.length === 0) {
        jarvisMsgs.push({
          from: "jarvis",
          text:
            "I got a response from the backend, but I don't recognize its format: " +
            JSON.stringify(data),
          timestamp: replyTime,
        });
      }

      setMessages((prev) => [...prev, ...jarvisMsgs]);

      if (primaryText && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(primaryText);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMessages((prev) => [
        ...prev,
        {
          from: "jarvis",
          text:
            "Hmm, I couldn't reach my automation core (backend). Could you check if the server is running?",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceClick = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        {
          from: "jarvis",
          text:
            "🎙️ I’m all ears, but this browser doesn’t support live voice capture. Try desktop Chrome or Edge.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsRecording(true);

      recognition.onstart = () => {
        console.log("Voice recognition started");
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Voice input:", transcript);
        setInput(transcript);

        // auto-send after a short delay
        setTimeout(() => {
          handleSend();
        }, 300);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        setMessages((prev) => [
          ...prev,
          {
            from: "jarvis",
            text: "🎙️ Voice hiccup: " + event.error,
            timestamp: new Date(),
          },
        ]);
      };

      recognition.onend = () => {
        console.log("Voice recognition ended");
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Voice init error:", err);
      setIsRecording(false);
      setMessages((prev) => [
        ...prev,
        {
          from: "jarvis",
          text:
            "🎙️ I tried to start listening, but something went wrong. Maybe refresh the page?",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const formatTime = (date) => {
    if (!date) return "";
    try {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center px-3">
      <div className="app-shell w-full max-w-3xl h-[90vh] bg-slate-950/80 border border-slate-800/80 rounded-3xl flex flex-col overflow-hidden shadow-2xl backdrop-blur">
        {/* Header */}
        <header className="px-5 py-4 border-b border-slate-800/70 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-emerald-300 text-lg">
                J
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight">
                  Jarvis Live Console
                </h1>
                <p className="text-[11px] text-slate-400">
                  Natural language → real desktop actions.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                  isLoading
                    ? "border-amber-400/40 text-amber-300"
                    : "border-emerald-400/40 text-emerald-300"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {isLoading ? "Thinking…" : "Online"}
              </span>
            </div>
          </div>

          {/* 🎙️ Voice visualizer + hint */}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
            <div className="voice-visualizer flex items-end gap-[3px]">
              <span
                className={`voice-bar ${isRecording ? "voice-bar-active" : ""}`}
                style={{ animationDelay: "0ms" }}
              />
              <span
                className={`voice-bar ${isRecording ? "voice-bar-active" : ""}`}
                style={{ animationDelay: "120ms" }}
              />
              <span
                className={`voice-bar ${isRecording ? "voice-bar-active" : ""}`}
                style={{ animationDelay: "240ms" }}
              />
              <span
                className={`voice-bar ${isRecording ? "voice-bar-active" : ""}`}
                style={{ animationDelay: "360ms" }}
              />
            </div>
            <span>
              {isRecording
                ? "Listening… say a command or press Esc to cancel."
                : "Tip: Press Ctrl+Space to talk to Jarvis."}
            </span>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gradient-to-b from-slate-950/40 via-slate-900/40 to-slate-950/60">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.from === "you" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`message-bubble max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-md ${
                  m.from === "you"
                    ? "bg-emerald-600 text-white rounded-br-sm"
                    : "bg-slate-800/90 text-slate-100 rounded-bl-sm border border-slate-700/70"
                }`}
              >
                <div>{m.text}</div>
                <div
                  className={`mt-1 text-[10px] ${
                    m.from === "you"
                      ? "text-emerald-100/70 text-right"
                      : "text-slate-400/80 text-left"
                  }`}
                >
                  {m.from === "you" ? "You" : "Jarvis"} ·{" "}
                  {formatTime(m.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {/* Typing / thinking indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="message-bubble max-w-[60%] rounded-2xl px-3 py-2 text-xs bg-slate-800/90 text-slate-200 rounded-bl-sm border border-slate-700/70 flex items-center gap-2 shadow-md">
                <span className="inline-flex gap-1 items-center">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </span>
                <span className="text-[11px] text-slate-300">
                  Jarvis is thinking…
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* Input bar */}
        <footer className="border-t border-slate-800/70 px-3 py-2 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleVoiceClick}
              className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-xs shadow-sm ${
                isRecording
                  ? "border-emerald-400/70 bg-emerald-500/10 animate-pulse text-emerald-200"
                  : "border-slate-700 bg-slate-900/80 text-slate-300"
              }`}
            >
              🎙️
            </button>
            <input
              className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-500"
              placeholder="Tell Jarvis what to do..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl shadow-md transition-transform active:scale-[0.97]"
            >
              Send
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
