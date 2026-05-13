"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApi, getErrorMessage } from "@/lib/api";
import { ResolvedLocation, WeatherHistoryRead, WeatherSummary } from "@/lib/types";
import { CurrentWeather } from "@/components/weather/CurrentWeather";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast, ToastState } from "@/components/ui/Toast";
import { format } from "date-fns";
import { ArrowLeft, Download, FileText } from "lucide-react";

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
  const [mobileDetailId, setMobileDetailId] = useState<number | null>(null);

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
    const trimmedLocation = q.trim();
    const locationPayload = /^\d{5}(?:-\d{4})?$/.test(trimmedLocation)
      ? { zip: trimmedLocation }
      : { q: trimmedLocation };
    try {
      await fetchApi("/weather/history", {
        method: "POST",
        body: JSON.stringify({
          ...locationPayload,
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
      if (mobileDetailId === pendingDeleteId) setMobileDetailId(null);
      setToast({ tone: "success", message: "Weather history record deleted." });
      setPendingDeleteId(null);
      loadHistory();
    } catch (err: unknown) {
      setToast({ tone: "error", message: getErrorMessage(err, "Failed to delete history record") });
    }
  };

  const selectedRecord = history.find(h => h.id === selectedId);
  const mobileDetailRecord = history.find(h => h.id === mobileDetailId);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const renderSearchAndList = (openMobileDetail: boolean) => (
    <div className="flex flex-col gap-6 min-w-0">
      <h2 className="text-2xl font-semibold">Weather History</h2>
      <p className="text-white/60 text-sm">Search locations & past data</p>

      <form onSubmit={handleCreate} className="flex flex-col gap-4 bg-white/5 p-5 rounded-[24px]">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(180px,1fr)_180px_180px_116px]">
          <input
            type="text"
            placeholder="City or ZIP"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="min-w-0 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-[#D4FF00]"
            required
          />
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="min-w-0 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4FF00]"
            required
          />
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="min-w-0 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4FF00]"
            required
          />
          <button
            type="submit"
            disabled={isCreating}
            className="min-w-[116px] bg-[#D4FF00] text-black px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#bce600] transition-colors disabled:opacity-50"
          >
            {isCreating ? "Loading" : "Search"}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </form>

      <div className="flex flex-col gap-4 pb-4">
        {isLoading ? (
          <div className="animate-pulse h-24 bg-white/10 rounded-[20px] w-full"></div>
        ) : history.length === 0 ? (
          <p className="text-white/50 py-8 text-center">No history records found.</p>
        ) : (
          history.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                setSelectedId(h.id);
                if (openMobileDetail) setMobileDetailId(h.id);
              }}
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
  );

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete history record?"
        message="This removes the stored weather request and its export data from the local database."
        confirmLabel="Delete"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />

      <div className="lg:hidden">
        {mobileDetailRecord ? (
          <HistoryRecordDetail
            record={mobileDetailRecord}
            apiBase={API_BASE}
            onBack={() => setMobileDetailId(null)}
            onDelete={handleDelete}
          />
        ) : (
          renderSearchAndList(true)
        )}
      </div>

      <div className="hidden max-w-[1400px] mx-auto lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-8">
        {renderSearchAndList(false)}
        <div className="w-full min-w-0">
          {selectedRecord ? (
            <HistoryRecordDetail
              record={selectedRecord}
              apiBase={API_BASE}
              onDelete={handleDelete}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-white/50 py-20 rounded-[32px] bg-black/20">
              Select a record to view details
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function HistoryRecordDetail({
  record,
  apiBase,
  onDelete,
  onBack,
}: {
  record: WeatherHistoryRead;
  apiBase: string;
  onDelete: (id: number) => void;
  onBack?: () => void;
}) {
  const location = historyLocation(record);
  const [activeTab, setActiveTab] = useState<"current" | "historical">("current");
  const historicalRows = extractHistoricalRows(record.date_range_weather);

  return (
    <div className="flex flex-col gap-5">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      )}

      <div className="rounded-[32px] bg-black/20 p-5 lg:p-8">
        <div className="mb-5 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold">{record.location_name}</h2>
            <p className="text-white/60">
              {format(new Date(record.start_date), "MMM d, yyyy")} - {format(new Date(record.end_date), "MMM d, yyyy")}
            </p>
          </div>
          <button
            onClick={() => onDelete(record.id)}
            className="text-sm font-medium text-red-400 hover:text-red-300"
          >
            Delete
          </button>
        </div>

        <div className="mb-5 flex gap-2 rounded-full bg-white/5 p-1">
          {(["current", "historical"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? "bg-[#D4FF00] text-black" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "current" ? (
          <section className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <CurrentWeather weather={historyWeather(record.current_weather)} location={location} />
          </section>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-semibold text-[#D4FF00]">Download historical weather</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Exports use OpenWeather One Call timemachine data from {format(new Date(record.start_date), "MMM d, yyyy")} to{" "}
                {format(new Date(record.end_date), "MMM d, yyyy")}.
              </p>
              <p className="mt-3 text-xs text-white/45">
                {historicalRows.length ? `${historicalRows.length} historical records stored.` : "No historical rows were returned by the provider."}
              </p>
            </div>
            <div className="flex gap-4">
              <a
                href={`${apiBase}/exports/history/${record.id}.csv`}
                download
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                <Download className="h-4 w-4" /> CSV
              </a>
              <a
                href={`${apiBase}/exports/history/${record.id}.pdf`}
                download
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#D4FF00] py-3 text-sm font-medium text-black transition-colors hover:bg-[#bce600]"
              >
                <FileText className="h-4 w-4" /> PDF
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function historyLocation(record: WeatherHistoryRead): ResolvedLocation {
  return {
    source_input: record.source_input,
    location_name: record.location_name,
    latitude: record.latitude,
    longitude: record.longitude,
    country: record.country ?? undefined,
    state: record.state ?? undefined,
  };
}

function historyWeather(currentWeather: Record<string, unknown>): WeatherSummary {
  return {
    temperature: numberOrUndefined(currentWeather.temperature),
    feels_like: numberOrUndefined(currentWeather.feels_like),
    condition: stringOrDefault(currentWeather.condition, "Weather"),
    description: stringOrDefault(currentWeather.description, "stored weather"),
    humidity: numberOrUndefined(currentWeather.humidity),
    wind_speed: numberOrUndefined(currentWeather.wind_speed),
    sunrise: stringOrUndefined(currentWeather.sunrise),
    sunset: stringOrUndefined(currentWeather.sunset),
    local_time: stringOrUndefined(currentWeather.local_time),
    summary: stringOrDefault(currentWeather.summary, "Stored weather summary"),
  };
}

function extractHistoricalRows(dateRangeWeather: Record<string, unknown>): Record<string, unknown>[] {
  const rows = Array.isArray(dateRangeWeather.days) ? dateRangeWeather.days : dateRangeWeather.hourly;
  if (!Array.isArray(rows)) return [];
  return rows.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}
