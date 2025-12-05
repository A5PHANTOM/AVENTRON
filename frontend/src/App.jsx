import { useState, useEffect, useRef } from "react";

function App() {
  const [messages, setMessages] = useState([
    { from: "jarvis", text: "Hi, I am Jarvis. What would you like me to do?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);

  // auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    setInput("");

    // show user's message
    setMessages((prev) => [...prev, { from: "you", text: userText }]);
    setIsLoading(true);

    console.log("Sending to backend:", userText);

    try {
      const res = await fetch("/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: userText }),
      });

      console.log("Got response status:", res.status);

      const data = await res.json();
      console.log("Response JSON:", data);

      const jarvisMsgs = [];

      if (data.spoken_response) {
        jarvisMsgs.push({ from: "jarvis", text: data.spoken_response });
      }

      if (Array.isArray(data.logs)) {
        data.logs.forEach((log) => {
          jarvisMsgs.push({ from: "jarvis", text: log });
        });
      }

      if (jarvisMsgs.length === 0) {
        jarvisMsgs.push({
          from: "jarvis",
          text: "Backend responded but no logs/spoken_response were found.",
        });
      }

      setMessages((prev) => [...prev, ...jarvisMsgs]);

      // text-to-speech
      if (data.spoken_response && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(data.spoken_response);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMessages((prev) => [
        ...prev,
        { from: "jarvis", text: "⚠ Unable to reach backend" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceClick = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsRecording(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Voice input:", transcript);
      setInput(transcript);

      // auto-send after a short delay
      setTimeout(() => {
        handleSend();
      }, 300);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-3xl h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Jarvis Live Console</h1>
            <p className="text-xs text-slate-400">
              Type or speak commands. Jarvis will control the system.
            </p>
          </div>
          <div className="text-xs">
            {isLoading ? (
              <span className="text-amber-400">Thinking…</span>
            ) : (
              <span className="text-emerald-400">Ready</span>
            )}
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.from === "you" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.from === "you"
                    ? "bg-emerald-600 text-white rounded-br-sm"
                    : "bg-slate-800 text-slate-100 rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </main>

        {/* Input bar */}
        <footer className="border-t border-slate-800 px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleVoiceClick}
              className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-xs ${
                isRecording
                  ? "border-emerald-400 animate-pulse"
                  : "border-slate-700"
              }`}
            >
              🎙️
            </button>
            <input
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
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
              className="shrink-0 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl"
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
