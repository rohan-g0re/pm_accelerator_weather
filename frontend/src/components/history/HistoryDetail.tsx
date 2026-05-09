"use client";

import { useState } from "react";
import { fetchApi, getErrorMessage } from "@/lib/api";
import { WeatherHistoryRead } from "@/lib/types";
import { format } from "date-fns";
import { Download, FileText } from "lucide-react";

export function HistoryDetail({ history, onDelete }: { history: WeatherHistoryRead; onDelete: (id: number) => void }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setIsAsking(true);
    try {
      const res = await fetchApi<{ answer: string }>("/weather/ask", {
        method: "POST",
        body: JSON.stringify({ question, history_id: history.id }),
      });
      setAnswer(res.answer);
    } catch (err: unknown) {
      setAnswer(getErrorMessage(err, "Failed to get answer"));
    } finally {
      setIsAsking(false);
    }
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{history.location_name}</h2>
          <p className="text-white/60">
            {format(new Date(history.start_date), "MMM d, yyyy")} - {format(new Date(history.end_date), "MMM d, yyyy")}
          </p>
        </div>
        <button 
          onClick={() => onDelete(history.id)}
          className="text-red-400 hover:text-red-300 text-sm font-medium"
        >
          Delete
        </button>
      </div>

      {history.generated_image_url && (
        <div className="w-full h-48 rounded-2xl overflow-hidden relative">
          <img src={history.generated_image_url} alt="Generated Clipart" className="object-cover w-full h-full" />
        </div>
      )}

      <div className="bg-white/10 rounded-2xl p-4">
        <h3 className="font-semibold text-[#D4FF00] mb-2">AI Summary</h3>
        <p className="text-white/80 leading-relaxed text-sm">{history.summary}</p>
      </div>

      <div className="bg-black/40 rounded-2xl p-4">
        <h3 className="font-semibold text-white mb-4">Ask DeepSeek</h3>
        <form onSubmit={handleAsk} className="flex flex-col gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Should I carry an umbrella?"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-[#D4FF00] text-sm text-white placeholder:text-white/30"
          />
          <button 
            type="submit" 
            disabled={isAsking || !question.trim()}
            className="bg-[#D4FF00]/10 text-[#D4FF00] py-2 rounded-xl text-sm font-medium hover:bg-[#D4FF00]/20 transition-colors disabled:opacity-50"
          >
            {isAsking ? "Asking..." : "Ask"}
          </button>
        </form>
        {answer && (
          <div className="mt-4 p-3 bg-white/5 rounded-xl text-sm text-white/90 leading-relaxed">
            {answer}
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-2">
        <a 
          href={`${API_BASE}/exports/history/${history.id}.csv`} 
          download
          className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 py-3 rounded-xl transition-colors text-sm font-medium text-white"
        >
          <Download className="w-4 h-4" /> CSV
        </a>
        <a 
          href={`${API_BASE}/exports/history/${history.id}.pdf`} 
          download
          className="flex-1 flex items-center justify-center gap-2 bg-[#D4FF00] hover:bg-[#bce600] text-black py-3 rounded-xl transition-colors text-sm font-medium"
        >
          <FileText className="w-4 h-4" /> PDF
        </a>
      </div>
    </div>
  );
}
