"use client";

import { CurrentWeather } from "@/components/weather/CurrentWeather";
import { HourlyTimeline } from "@/components/weather/HourlyTimeline";
import { WeatherInfoPanel } from "@/components/weather/WeatherInfoPanel";
import { OneCallWeatherResponse } from "@/lib/types";

interface WeatherDashboardViewProps {
  data: OneCallWeatherResponse;
  backgroundImage?: string | null;
}

export function WeatherDashboardView({ data, backgroundImage }: WeatherDashboardViewProps) {
  return (
    <div className="flex min-w-0 flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
      <div className="min-w-0">
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
      </div>

      <WeatherInfoPanel
        key={`${data.location.latitude},${data.location.longitude}`}
        location={data.location}
        initialForecast={data.daily}
      />
    </div>
  );
}
