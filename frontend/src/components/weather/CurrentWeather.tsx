import { format } from "date-fns";
import { Droplets, Wind, Sunrise, Thermometer } from "lucide-react";
import { WeatherSummary, ResolvedLocation } from "@/lib/types";

export function CurrentWeather({ 
  weather, 
  location 
}: { 
  weather: WeatherSummary; 
  location: ResolvedLocation;
}) {
  const formatTime = (isoString?: string) => {
    if (!isoString) return "--:--";
    return format(new Date(isoString), "HH:mm");
  };

  return (
    <div className="flex flex-col gap-8 w-full min-w-0 mt-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl md:text-7xl font-light text-[#D4FF00] tracking-tighter">
            {weather.temperature !== undefined ? `${Math.round(weather.temperature)}°C` : "--"}
          </h1>
          <p className="text-xl text-white mt-2 font-medium">
            {location.location_name} {location.country ? `, ${location.country}` : ""}
          </p>
          <p className="text-white/70 capitalize text-lg mt-1">{weather.description}</p>
        </div>
        <div className="text-left md:text-right text-white/60">
          <p>{weather.local_time ? format(new Date(weather.local_time), "EEE, d MMM yyyy") : ""}</p>
          <p>{weather.local_time ? format(new Date(weather.local_time), "HH:mm:ss") : ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 min-w-0">
        <div className="bg-black/20 backdrop-blur-xl rounded-3xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white/60">
            <Droplets className="h-4 w-4" />
            <span className="text-sm font-medium">Humidity</span>
          </div>
          <span className="text-2xl text-white">{weather.humidity}%</span>
        </div>

        <div className="bg-black/20 backdrop-blur-xl rounded-3xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white/60">
            <Wind className="h-4 w-4" />
            <span className="text-sm font-medium">Wind</span>
          </div>
          <span className="text-2xl text-white">{weather.wind_speed} m/s</span>
        </div>

        <div className="bg-black/20 backdrop-blur-xl rounded-3xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white/60">
            <Sunrise className="h-4 w-4" />
            <span className="text-sm font-medium">Sunrise / Sunset</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg text-white">{formatTime(weather.sunrise)}</span>
            <span className="text-sm text-white/60">{formatTime(weather.sunset)}</span>
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-xl rounded-3xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white/60">
            <Thermometer className="h-4 w-4" />
            <span className="text-sm font-medium">Feels Like</span>
          </div>
          <span className="text-2xl text-white">
            {weather.feels_like !== undefined ? `${Math.round(weather.feels_like)}°C` : "--"}
          </span>
        </div>
      </div>
    </div>
  );
}
