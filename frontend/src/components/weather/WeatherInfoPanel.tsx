"use client";

import { useEffect, useRef, useState } from "react";
import { NearbyPlaces } from "@/components/saved/NearbyPlaces";
import { fetchApi, getErrorMessage } from "@/lib/api";
import {
  ForecastDay,
  OneCallWeatherResponse,
  ResolvedLocation,
  WeatherOverviewResponse,
  WeatherQuestionResponse,
} from "@/lib/types";

export type WeatherInfoTab = "forecast" | "qa" | "nearby";

interface WeatherInfoPanelProps {
  location: Pick<ResolvedLocation, "location_name" | "latitude" | "longitude">;
  tabs?: WeatherInfoTab[];
  initialForecast?: ForecastDay[];
  initialSummary?: string | null;
  className?: string;
}

export function WeatherInfoPanel({
  location,
  tabs = ["forecast", "qa", "nearby"],
  initialForecast,
  initialSummary = null,
  className = "",
}: WeatherInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<WeatherInfoTab>(tabs[0] ?? "forecast");
  const [forecast, setForecast] = useState<ForecastDay[]>(initialForecast ?? []);
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [isWeatherLoading, setIsWeatherLoading] = useState(!initialForecast);
  const [isSummaryLoading, setIsSummaryLoading] = useState(!initialSummary);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (initialForecast && initialSummary) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const params = new URLSearchParams({
      lat: location.latitude.toString(),
      lon: location.longitude.toString(),
    });

    async function loadWeather() {
      await Promise.resolve();
      if (requestId !== requestIdRef.current) return;
      setError(null);
      setAnswer(null);

      if (!initialForecast) {
        setIsWeatherLoading(true);
        try {
          const weather = await fetchApi<OneCallWeatherResponse>(`/weather/one-call?${params.toString()}`);
          if (requestId === requestIdRef.current) {
            setForecast(weather.daily.slice(0, 5));
            setSummary((current) => current ?? weather.current.summary);
          }
        } catch (err: unknown) {
          if (requestId === requestIdRef.current) {
            setError(getErrorMessage(err, "Failed to load forecast"));
          }
        } finally {
          if (requestId === requestIdRef.current) {
            setIsWeatherLoading(false);
          }
        }
      }

      if (!initialSummary) {
        setIsSummaryLoading(true);
        try {
          const overview = await fetchApi<WeatherOverviewResponse>(`/weather/overview?${params.toString()}`);
          if (requestId === requestIdRef.current) {
            setSummary(overview.summary);
          }
        } catch (err: unknown) {
          console.error(err);
        } finally {
          if (requestId === requestIdRef.current) {
            setIsSummaryLoading(false);
          }
        }
      }
    }

    void loadWeather();
  }, [initialForecast, initialSummary, location.latitude, location.longitude]);

  const askQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    setIsAsking(true);
    setAnswer(null);
    try {
      const result = await fetchApi<WeatherQuestionResponse>("/weather/ask", {
        method: "POST",
        body: JSON.stringify({
          question,
          weather_context: {
            location: location.location_name,
            summary,
            forecast,
          },
        }),
      });
      setAnswer(result.answer);
    } catch (err: unknown) {
      setAnswer(getErrorMessage(err, "Failed to get answer"));
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className={`w-full bg-black/20 backdrop-blur-xl rounded-[32px] p-6 lg:p-8 flex flex-col gap-5 shrink-0 h-fit max-h-full overflow-y-auto ${className}`}>
      <div className="flex gap-2 rounded-full bg-white/5 p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? "bg-[#D4FF00] text-black" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab === "qa" ? "Q&A" : tab}
          </button>
        ))}
      </div>

      {activeTab === "forecast" && (
        <>
          <h3 className="text-xl font-semibold">5-Day Forecast</h3>
          {error ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/20 p-4 text-sm text-red-100">{error}</div>
          ) : isWeatherLoading ? (
            <div className="h-[400px] animate-pulse rounded-2xl bg-white/10" />
          ) : forecast.length ? (
            <div className="flex flex-col gap-4">
              {forecast.slice(0, 5).map((day, idx) => (
                <div key={`${day.date}-${idx}`} className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-white/70">
                      {idx === 0 ? "Today" : new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span className="capitalize">{day.description}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {day.icon && <img src={`https://openweathermap.org/img/wn/${day.icon}.png`} className="h-8 w-8 opacity-80" alt={day.condition} />}
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-[#D4FF00]">{day.high !== undefined ? Math.round(day.high) : "-"}&deg;</span>
                      <span className="text-sm text-white/50">{day.low !== undefined ? Math.round(day.low) : "-"}&deg;</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white/5 p-4 text-center text-sm text-white/50">No forecast data available.</div>
          )}
        </>
      )}

      {activeTab === "qa" && (
        <div className="flex flex-col gap-5">
          <div className="rounded-[28px] border border-white/15 bg-black/25 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4FF00]">Forecast Summary</p>
            <p className="text-sm leading-relaxed text-white/80">
              {isSummaryLoading && !summary ? "Loading OpenWeather summary..." : summary || "No summary available yet."}
            </p>
          </div>

          <div className="rounded-[28px] bg-black/40 p-5">
            <form onSubmit={askQuestion} className="flex flex-col gap-3">
              <input
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask anything about this weather"
                disabled={isAsking}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#D4FF00] focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isAsking || !question.trim()}
                className="rounded-xl bg-[#D4FF00]/10 py-2.5 text-sm font-medium text-[#D4FF00] transition-colors hover:bg-[#D4FF00]/20 disabled:opacity-50"
              >
                {isAsking ? "Asking..." : "Ask"}
              </button>
            </form>
            {answer && <div className="mt-4 rounded-xl bg-white/5 p-4 text-sm leading-relaxed text-white/90">{answer}</div>}
          </div>
        </div>
      )}

      {activeTab === "nearby" && <NearbyPlaces location={location} />}
    </div>
  );
}
