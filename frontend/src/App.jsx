import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold text-emerald-400">Jarvis Console</h1>

      <button
        className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl text-lg font-medium shadow-md transition"
        onClick={() => setCount(count + 1)}
      >
        Count is {count}
      </button>

      <p className="text-slate-400">Tailwind is working ✔</p>
    </div>
  );
}

export default App;
