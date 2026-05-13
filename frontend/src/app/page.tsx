"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CurrentWeather } from "@/components/weather/CurrentWeather";
import { HourlyTimeline } from "@/components/weather/HourlyTimeline";
import { SearchBar } from "@/components/weather/SearchBar";
import { WeatherInfoPanel } from "@/components/weather/WeatherInfoPanel";
import { Toast, ToastState } from "@/components/ui/Toast";
import { fetchApi, getErrorMessage } from "@/lib/api";
import {
  OneCallWeatherResponse,
  WeatherBackgroundResponse,
} from "@/lib/types";

export default function Home() {
  const [data, setData] = useState<OneCallWeatherResponse | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
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

  const fetchWeather = useCallback(async (params: URLSearchParams) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);
    setBackgroundImage(null);
    try {
      const result = await fetchApi<OneCallWeatherResponse>(`/weather/one-call?${params.toString()}`);
      if (requestId !== requestIdRef.current) return;
      setData(result);
      void fetchWeatherBackground(result, requestId);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      setError(getErrorMessage(err, "Failed to fetch weather"));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchWeatherBackground]);

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
          generated_image_url: backgroundImage,
        }),
      });
      setToast({ tone: "success", message: "Saved to your library." });
    } catch (err: unknown) {
      setToast({ tone: "error", message: getErrorMessage(err, "Failed to save location") });
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
          : null;

    if (initialParams) {
      window.setTimeout(() => {
        fetchWeather(initialParams);
      }, 0);
    }
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
    <div className="flex min-w-0 flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="min-w-0 flex flex-col gap-6">
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
          <div className="rounded-[32px] bg-black/20 p-6 text-center text-sm text-white/60">
            Loading forecast...
          </div>
        )}

        {data && (
          <section
            className="relative min-h-[520px] overflow-hidden rounded-[32px] border border-white/10 bg-black/20 p-5 md:p-8"
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

      {data ? (
        <WeatherInfoPanel
          key={`${data.location.latitude},${data.location.longitude}`}
          location={data.location}
          initialForecast={data.daily}
        />
      ) : (
        <div className="w-full rounded-[32px] bg-black/20 p-6 text-center text-sm text-white/50 lg:p-8">
          Search a location to view forecast, Q&A, and nearby places.
        </div>
      )}
    </div>
  );
}
