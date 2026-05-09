"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApi, getErrorMessage } from "@/lib/api";
import { WeatherHistoryRead } from "@/lib/types";
import { HistoryDetail } from "@/components/history/HistoryDetail";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast, ToastState } from "@/components/ui/Toast";
import { format } from "date-fns";

export default function HistoryPage() {
  const [history, setHistory] = useState<WeatherHistoryRead[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [q, setQ] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchApi<WeatherHistoryRead[]>("/weather/history");
      setHistory(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    window.setTimeout(() => {
      loadHistory();
    }, 0);
  }, [loadHistory]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);
    try {
      await fetchApi("/weather/history", {
        method: "POST",
        body: JSON.stringify({
          q,
          start_date: startDate,
          end_date: endDate
        })
      });
      setQ("");
      setStartDate("");
      setEndDate("");
      setToast({ tone: "success", message: "Weather history record created." });
      loadHistory();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create history record"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (pendingDeleteId === null) return;
    try {
      await fetchApi(`/weather/history/${pendingDeleteId}`, { method: "DELETE" });
      if (selectedId === pendingDeleteId) setSelectedId(null);
      setToast({ tone: "success", message: "Weather history record deleted." });
      setPendingDeleteId(null);
      loadHistory();
    } catch (err: unknown) {
      setToast({ tone: "error", message: getErrorMessage(err, "Failed to delete history record") });
    }
  };

  const selectedRecord = history.find(h => h.id === selectedId);

  return (
    <div className="w-full max-w-[1400px] mx-auto h-full">
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 w-full h-full">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete history record?"
        message="This removes the stored weather request and its export data from the local database."
        confirmLabel="Delete"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />
      <div className="flex flex-col gap-6 min-w-0">
        <h2 className="text-2xl font-semibold">Weather History</h2>
        <p className="text-white/60 text-sm">Search locations & past data</p>

        {/* Create Form */}
        <form onSubmit={handleCreate} className="flex flex-col gap-4 bg-white/5 p-5 rounded-[24px]">
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              placeholder="City or ZIP" 
              value={q} 
              onChange={e => setQ(e.target.value)}
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-[#D4FF00]"
              required
            />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4FF00]"
              required
            />
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4FF00]"
              required
            />
            <button 
              type="submit" 
              disabled={isCreating}
              className="bg-[#D4FF00] text-black px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#bce600] transition-colors disabled:opacity-50"
            >
              {isCreating ? "Loading..." : "Search"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>

        {/* History List */}
        <div className="flex flex-col gap-4 overflow-y-auto pb-4">
          {isLoading ? (
            <div className="animate-pulse h-24 bg-white/10 rounded-[20px] w-full"></div>
          ) : history.length === 0 ? (
            <p className="text-white/50 py-8 text-center">No history records found.</p>
          ) : (
            history.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelectedId(h.id)}
                className={`text-left p-5 rounded-[20px] transition-all ${
                  selectedId === h.id ? "bg-white/20 ring-1 ring-[#D4FF00]" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-lg">{h.location_name}</span>
                  <span className="text-white/50 text-sm">
                    {format(new Date(h.start_date), "MMM d")} - {format(new Date(h.end_date), "MMM d")}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full bg-black/20 backdrop-blur-xl rounded-[32px] p-6 lg:p-8 lg:max-h-[calc(100vh-8rem)] overflow-y-auto">
        {selectedRecord ? (
          <HistoryDetail history={selectedRecord} onDelete={handleDelete} />
        ) : (
          <div className="h-full flex items-center justify-center text-white/50 py-20">
            Select a record to view details
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
