"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CurrentWeather } from "@/components/weather/CurrentWeather";
import { HourlyTimeline } from "@/components/weather/HourlyTimeline";
import { WeatherInfoPanel } from "@/components/weather/WeatherInfoPanel";
import { fetchApi, getErrorMessage } from "@/lib/api";
import { OneCallWeatherResponse, ResolvedLocation } from "@/lib/types";

interface LocationWeatherDetailProps {
  location: Pick<ResolvedLocation, "location_name" | "latitude" | "longitude" | "source_input"> & {
    country?: string | null;
    state?: string | null;
  };
  onBack?: () => void;
}

export function LocationWeatherDetail({ location, onBack }: LocationWeatherDetailProps) {
  const [data, setData] = useState<OneCallWeatherResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const params = new URLSearchParams({
      lat: location.latitude.toString(),
      lon: location.longitude.toString(),
    });

    async function loadWeather() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchApi<OneCallWeatherResponse>(`/weather/one-call?${params.toString()}`);
        if (requestId === requestIdRef.current) {
          setData(result);
        }
      } catch (err: unknown) {
        if (requestId === requestIdRef.current) {
          setError(getErrorMessage(err, "Failed to load weather details"));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    void loadWeather();
  }, [location.latitude, location.longitude]);

  return (
    <div className="flex flex-col gap-6">
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

      {isLoading && (
        <div className="flex animate-pulse flex-col gap-4">
          <div className="h-56 rounded-[32px] bg-white/10" />
          <div className="h-72 rounded-[32px] bg-white/10" />
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-500/40 bg-red-500/20 p-4 text-sm text-red-100">{error}</div>}

      {data && (
        <>
          <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/20 p-5">
            <CurrentWeather weather={data.current} location={data.location} />
            <HourlyTimeline hourly={data.hourly} />
          </section>
          <WeatherInfoPanel
            key={`${data.location.latitude},${data.location.longitude}`}
            location={data.location}
            initialForecast={data.daily}
          />
        </>
      )}
    </div>
  );
}
