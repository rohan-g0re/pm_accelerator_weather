"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CurrentWeather } from "@/components/weather/CurrentWeather";
import { HourlyTimeline } from "@/components/weather/HourlyTimeline";
import { SearchBar } from "@/components/weather/SearchBar";
import { Toast, ToastState } from "@/components/ui/Toast";
import { fetchApi, getErrorMessage } from "@/lib/api";
import {
  OneCallWeatherResponse,
  WeatherBackgroundResponse,
  WeatherOverviewResponse,
  WeatherQuestionResponse,
} from "@/lib/types";

type WeatherPanelTab = "forecast" | "summary" | "qa";

export default function Home() {
  const [data, setData] = useState<OneCallWeatherResponse | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [overviewSummary, setOverviewSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<WeatherPanelTab>("forecast");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const requestIdRef = useRef(0);

  const fetchWeatherBackground = useCallback(async (weatherData: OneCallWeatherResponse, requestId: number) => {
    try {
      const result = await fetchApi<WeatherBackgroundResponse>("/images/weather-background", {
        method: "POST",
        body: JSON.stringify({
          location: weatherData.location,
          weather: weatherData.current,
        }),
      });
      if (requestId === requestIdRef.current) {
        setBackgroundImage(result.generated_image_url);
      }
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  const fetchWeatherOverview = useCallback(async (weatherData: OneCallWeatherResponse, requestId: number) => {
    setIsSummaryLoading(true);
    const params = new URLSearchParams({
      lat: weatherData.location.latitude.toString(),
      lon: weatherData.location.longitude.toString(),
    });
    try {
      const result = await fetchApi<WeatherOverviewResponse>(`/weather/overview?${params.toString()}`);
      if (requestId === requestIdRef.current) {
        setOverviewSummary(result.summary);
      }
    } catch (err: unknown) {
      console.error(err);
      if (requestId === requestIdRef.current) {
        setOverviewSummary(weatherData.current.summary);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsSummaryLoading(false);
      }
    }
  }, []);

  const fetchWeather = useCallback(async (params: URLSearchParams) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);
    setBackgroundImage(null);
    setOverviewSummary(null);
    setAnswer(null);
    try {
      const result = await fetchApi<OneCallWeatherResponse>(`/weather/one-call?${params.toString()}`);
      if (requestId !== requestIdRef.current) return;
      setData(result);
      void fetchWeatherBackground(result, requestId);
      void fetchWeatherOverview(result, requestId);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      setError(getErrorMessage(err, "Failed to fetch weather"));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchWeatherBackground, fetchWeatherOverview]);

  const handleSearch = (q: string) => {
    const trimmed = q.trim();
    const coordinateMatch = trimmed.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    const zipMatch = trimmed.match(/^\d{5}(?:-\d{4})?$/);
    const params = new URLSearchParams();
    if (coordinateMatch) {
      params.set("lat", coordinateMatch[1]);
      params.set("lon", coordinateMatch[2]);
    } else if (zipMatch) {
      params.set("zip", trimmed);
    } else {
      params.set("q", trimmed);
    }
    fetchWeather(params);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const params = new URLSearchParams({
          lat: position.coords.latitude.toString(),
          lon: position.coords.longitude.toString(),
        });
        fetchWeather(params);
      },
      (err) => {
        console.error(err);
        setError("Unable to retrieve your location");
        setIsLoading(false);
      }
    );
  };

  const saveToLibrary = async () => {
    if (!data) return;
    try {
      await fetchApi("/saved-locations", {
        method: "POST",
        body: JSON.stringify({
          lat: data.location.latitude,
          lon: data.location.longitude,
          tag: data.location.location_name.substring(0, 40) || "Saved Location",
        }),
      });
      setToast({ tone: "success", message: "Saved to your library." });
    } catch (err: unknown) {
      setToast({ tone: "error", message: getErrorMessage(err, "Failed to save location") });
    }
  };

  const askDeepSeek = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data || !question.trim()) return;
    setIsAsking(true);
    setAnswer(null);
    try {
      const result = await fetchApi<WeatherQuestionResponse>("/weather/ask", {
        method: "POST",
        body: JSON.stringify({
          question,
          weather_context: {
            location: data.location.location_name,
            summary: overviewSummary || data.current.summary,
            current_weather: data.current,
            forecast: data.daily.slice(0, 5),
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = params.get("lat");
    const lon = params.get("lon");
    const q = params.get("q");
    const zip = params.get("zip");

    const initialParams = lat && lon
      ? new URLSearchParams({ lat, lon })
      : zip
        ? new URLSearchParams({ zip })
        : q
          ? new URLSearchParams({ q })
          : new URLSearchParams({ q: "New York" });

    window.setTimeout(() => {
      fetchWeather(initialParams);
    }, 0);
  }, [fetchWeather]);

  useEffect(() => {
    if (!data) return;
    const bg = document.getElementById("dynamic-bg");
    if (!bg) return;

    const currentCondition = data.current.condition.toLowerCase();

    let newClass = "fixed inset-0 z-0 transition-colors duration-1000 ";
    if (currentCondition.includes("rain") || currentCondition.includes("drizzle") || currentCondition.includes("thunder")) {
      newClass += "bg-gradient-to-br from-slate-800 via-gray-900 to-slate-800";
    } else if (currentCondition.includes("snow")) {
      newClass += "bg-gradient-to-br from-slate-300 via-blue-200 to-slate-100";
    } else if (currentCondition.includes("clear") || currentCondition.includes("sun")) {
      newClass += "bg-gradient-to-br from-sky-400 via-blue-500 to-sky-600";
    } else {
      newClass += "bg-gradient-to-br from-slate-900 via-[#112240] to-slate-800";
    }
    bg.className = newClass;
  }, [data]);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)] gap-8 w-full h-full min-w-0 overflow-hidden">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="min-w-0 flex flex-col gap-6 overflow-hidden">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Weather Forecast</h2>
            {data && (
              <button
                onClick={saveToLibrary}
                className="text-sm font-medium px-4 py-2 bg-white/10 hover:bg-[#D4FF00] hover:text-black rounded-full transition-colors"
              >
                Save to Library
              </button>
            )}
          </div>
          <SearchBar onSearch={handleSearch} onGeolocate={handleGeolocate} isLoading={isLoading} />
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-100">
            {error}
          </div>
        )}

        {isLoading && !data && (
          <div className="animate-pulse flex flex-col gap-6">
            <div className="h-32 bg-white/10 rounded-3xl w-full" />
            <div className="h-40 bg-white/10 rounded-3xl w-full" />
          </div>
        )}

        {data && (
          <section
            className="relative overflow-hidden rounded-[32px] p-5 md:p-8 min-h-[520px] border border-white/10 bg-black/20"
            style={
              backgroundImage
                ? {
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-[#10203a]/60 to-black/70" />
            <div className="absolute inset-0 bg-black/20 backdrop-saturate-75" />
            <div className="relative z-10 flex flex-col gap-2">
              <CurrentWeather weather={data.current} location={data.location} />
              <HourlyTimeline hourly={data.hourly} />
            </div>
          </section>
        )}
      </div>

      <div className="w-full bg-black/20 backdrop-blur-xl rounded-[32px] p-6 lg:p-8 flex flex-col gap-5 shrink-0 h-fit max-h-full overflow-y-auto">
        <div className="flex gap-2 rounded-full bg-white/5 p-1">
          {(["forecast", "summary", "qa"] as WeatherPanelTab[]).map((tab) => (
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
            {data ? (
              <div className="flex flex-col gap-4">
                {data.daily.slice(0, 5).map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-white/70 text-sm">
                        {idx === 0 ? "Today" : new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <span className="capitalize">{day.description}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {day.icon && <img src={`https://openweathermap.org/img/wn/${day.icon}.png`} className="w-8 h-8 opacity-80" alt={day.condition} />}
                      <div className="flex flex-col items-end">
                        <span className="text-[#D4FF00] font-medium">{day.high !== undefined ? Math.round(day.high) : "-"}&deg;</span>
                        <span className="text-white/50 text-sm">{day.low !== undefined ? Math.round(day.low) : "-"}&deg;</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              isLoading && <div className="h-[400px] bg-white/10 rounded-2xl animate-pulse" />
            )}
          </>
        )}

        {activeTab === "summary" && (
          <div className="bg-white/10 rounded-2xl p-5">
            <h3 className="font-semibold text-[#D4FF00] mb-3">Forecast Summary</h3>
            {data ? (
              <p className="text-white/80 leading-relaxed text-sm">
                {isSummaryLoading && !overviewSummary ? "Loading OpenWeather AI summary..." : overviewSummary || data.current.summary}
              </p>
            ) : (
              <p className="text-white/50 text-sm">Search a location to view the forecast summary.</p>
            )}
          </div>
        )}

        {activeTab === "qa" && (
          <div className="bg-black/40 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4">Ask DeepSeek</h3>
            <form onSubmit={askDeepSeek} className="flex flex-col gap-3">
              <input
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Can I go shopping?"
                disabled={!data || isAsking}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#D4FF00] text-sm text-white placeholder:text-white/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!data || isAsking || !question.trim()}
                className="bg-[#D4FF00]/10 text-[#D4FF00] py-2.5 rounded-xl text-sm font-medium hover:bg-[#D4FF00]/20 transition-colors disabled:opacity-50"
              >
                {isAsking ? "Asking..." : "Ask"}
              </button>
            </form>
            {answer && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl text-sm text-white/90 leading-relaxed">
                {answer}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
