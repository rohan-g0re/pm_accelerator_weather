"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { WeatherDashboardView } from "@/components/weather/WeatherDashboardView";
import { fetchApi, getErrorMessage } from "@/lib/api";
import { OneCallWeatherResponse, ResolvedLocation, WeatherBackgroundResponse } from "@/lib/types";

interface LocationWeatherDetailProps {
  location: Pick<ResolvedLocation, "location_name" | "latitude" | "longitude" | "source_input"> & {
    id?: number;
    country?: string | null;
    state?: string | null;
    generated_image_url?: string | null;
  };
  onBack?: () => void;
  onBackgroundSaved?: (generatedImageUrl: string) => void;
}

export function LocationWeatherDetail({ location, onBack, onBackgroundSaved }: LocationWeatherDetailProps) {
  const [data, setData] = useState<OneCallWeatherResponse | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(location.generated_image_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  const generateAndCacheBackground = useCallback(async (weatherData: OneCallWeatherResponse, requestId: number) => {
    try {
      const result = await fetchApi<WeatherBackgroundResponse>("/images/weather-background", {
        method: "POST",
        body: JSON.stringify({
          location: weatherData.location,
          weather: weatherData.current,
        }),
      });
      if (requestId !== requestIdRef.current || !result.generated_image_url) return;
      setBackgroundImage(result.generated_image_url);
      if (location.id) {
        await fetchApi(`/saved-locations/${location.id}`, {
          method: "PATCH",
          body: JSON.stringify({ generated_image_url: result.generated_image_url }),
        });
        onBackgroundSaved?.(result.generated_image_url);
      }
    } catch (err: unknown) {
      console.error(err);
    }
  }, [location.id, onBackgroundSaved]);

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
        if (requestId === requestIdRef.current && !location.generated_image_url) {
          void generateAndCacheBackground(result, requestId);
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
  }, [generateAndCacheBackground, location.generated_image_url, location.latitude, location.longitude]);

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
        <div className="rounded-[32px] bg-black/20 p-6 text-center text-sm text-white/60">
          Loading weather details...
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-500/40 bg-red-500/20 p-4 text-sm text-red-100">{error}</div>}

      {data && (
        <WeatherDashboardView data={data} backgroundImage={backgroundImage} />
      )}
    </div>
  );
}
