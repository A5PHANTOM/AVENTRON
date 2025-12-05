import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import "./index.css";

const BASE_URL = "https://liftable-actionable-joeann.ngrok-free.dev";
const ENDPOINTS = {
  "/command": `${BASE_URL}/command`,
  "/chat": `${BASE_URL}/chat`,
};

const automationPhrases = [
  "open chrome and go to gmail",
  // add more exact phrases here if your backend supports them
];

const sendToBackend = async (endpointKey, text) => {
  const url = ENDPOINTS[endpointKey] || ENDPOINTS["/chat"];
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Backend error:", err);
    return { text: "Connection to automation core failed. Check backend." };
  }
};

const speak = (text) => {
  if ("speechSynthesis" in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    utter.pitch = 1.05;
    window.speechSynthesis.speak(utter);
  }
};

/* ---------- STARTUP HUD ANIMATION ---------- */

const StartupHUD = ({ onComplete }) => {
  const [phase, setPhase] = useState(0); // 0→booting, 1→stabilizing, 2→fade

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2600);
    const t2 = setTimeout(() => setPhase(2), 4200);
    const t3 = setTimeout(() => onComplete(), 5200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className={`startup-shell ${phase === 2 ? "startup-fade-out" : ""}`}>
      <div className="startup-bg" />
      <div className="startup-grid" />
      <div className="startup-core">
        {/* outer decorative rings */}
        <div className="hud-ring hud-ring-outer" />
        <div className="hud-ring hud-ring-middle" />
        <div className="hud-ring hud-ring-inner" />

        {/* inner pulse */}
        <div className="hud-core-glow" />

        <div className="hud-core-text">
          <span className="hud-title">J.A.R.V.I.S</span>
          <span className="hud-subtitle">
            {phase === 0 && "BOOTING SYSTEMS"}
            {phase === 1 && "SYSTEMS ONLINE"}
            {phase === 2 && "HANDING CONTROL TO USER"}
          </span>
        </div>
      </div>

      {/* bottom boot log */}
      <div className="boot-log">
        <div className="boot-line">[ OK ] Power grid stabilized</div>
        <div className="boot-line">[ OK ] Neuro-link with automation core</div>
        <div className="boot-line">[ OK ] Visual HUD calibration</div>
        <div className="boot-line">[ OK ] Voice channel ready · Press Ctrl+Space</div>
      </div>
    </div>
  );
};

/* ---------- MESSAGE BUBBLES ---------- */

const Bubble = ({ sender, text }) => (
  <div
    className={`bubble-row ${
      sender === "YOU" ? "bubble-row-you" : "bubble-row-jarvis"
    }`}
  >
    <div className="bubble-shell">
      <div className="bubble-sender">{sender}</div>
      <div className="bubble-text">{text}</div>
    </div>
  </div>
);

/* ---------- MIC BUTTON ---------- */

const MicButton = ({ isRecording, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`mic-shell ${isRecording ? "mic-on" : "mic-off"}`}
  >
    <div className="mic-ring mic-ring-outer" />
    {isRecording && <div className="mic-ring mic-ring-pulse" />}
    <div className="mic-icon">
      🎙️
    </div>
  </button>
);

/* ---------- MAIN APP ---------- */

const App = () => {
  const [booted, setBooted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "JARVIS",
      text: "Console link established. What would you like to automate?",
    },
  ]);
  const [input, setInput] = useState("");
  const recognitionRef = useRef(null);
  const endRef = useRef(null);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const addUser = (text) =>
    setMessages((prev) => [...prev, { sender: "YOU", text }]);
  const addJarvis = (text) =>
    setMessages((prev) => [...prev, { sender: "JARVIS", text }]);

  const handleUserText = async (rawText) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    addUser(trimmed);

    const normalized = trimmed.toLowerCase();
    const endpointKey = automationPhrases.includes(normalized)
      ? "/command"
      : "/chat";

    const res = await sendToBackend(endpointKey, trimmed);
    if (res && res.text) {
      addJarvis(res.text);
      speak(res.text);
    } else {
      addJarvis("I received an empty response from the backend.");
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    handleUserText(text);
  };

  const handleMicToggle = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addJarvis(
        "This browser has no live voice capture. Desktop Chrome or Edge recommended."
      );
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      recognitionRef.current = rec;

      setIsRecording(true);

      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        handleUserText(transcript);
      };

      rec.onerror = (e) => {
        console.error("speech error", e.error);
        addJarvis("Voice channel hiccup: " + e.error);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      rec.start();
    } catch (err) {
      console.error("speech init error", err);
      addJarvis("Could not access microphone. Check permissions.");
      setIsRecording(false);
    }
  };

  // Ctrl+Space shortcut for voice
  useEffect(() => {
    const handler = (e) => {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (ctrlOrCmd && e.code === "Space") {
        e.preventDefault();
        handleMicToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  if (!booted) {
    return <StartupHUD onComplete={() => setBooted(true)} />;
  }

  return (
    <div className="console-root">
      <div className="console-bg" />
      <div className="console-grid" />
      <div className="console-core">
        {/* top bar */}
        <header className="console-header">
          <div className="console-title">
            <span className="title-main">J.A.R.V.I.S CONTROL CONSOLE</span>
            <span className="title-sub">
              Natural language → real desktop actions.
            </span>
          </div>
          <div className="console-status">
            <span className="status-dot" />
            <span className="status-text">ONLINE</span>
          </div>
        </header>

        {/* center HUD + chat */}
        <main className="console-body">
          {/* HUD disk on left */}
          <div className="hud-column">
            <div className="hud-disk">
              <div className="hud-ring hud-ring-outer" />
              <div className="hud-ring hud-ring-middle" />
              <div className="hud-ring hud-ring-inner" />
              <div className="hud-core-glow small" />
              <div className="hud-core-label">J.A.R.V.I.S</div>
            </div>
            <div className="hud-hint">
              Tip: Press <kbd>Ctrl</kbd>+<kbd>Space</kbd> to speak.
            </div>
          </div>

          {/* chat on right */}
          <div className="chat-column">
            <div className="chat-window">
              {messages.map((m, i) => (
                <Bubble key={i} sender={m.sender} text={m.text} />
              ))}
              <div ref={endRef} />
            </div>
            <div className="chat-input-row">
              <input
                className="chat-input"
                placeholder='Type a command, e.g. "Open Chrome and go to Gmail"...'
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
                className="chat-send"
                onClick={handleSend}
              >
                SEND
              </button>
              <MicButton isRecording={isRecording} onClick={handleMicToggle} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
