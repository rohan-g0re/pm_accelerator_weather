import { useRef } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Cloud } from "lucide-react";
import { HourlyForecast } from "@/lib/types";

export function HourlyTimeline({ hourly }: { hourly: HourlyForecast[] }) {
  const hours = hourly.slice(0, 24);
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (!hours.length) return null;

  const scrollHours = (direction: "left" | "right") => {
    scrollerRef.current?.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  };

  return (
    <div className="group relative w-full min-w-0 mt-8">
      <button
        type="button"
        onClick={() => scrollHours("left")}
        className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white/80 opacity-0 backdrop-blur-xl transition-opacity hover:text-[#D4FF00] group-hover:opacity-100 md:block"
        aria-label="Scroll hourly forecast left"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div
        ref={scrollerRef}
        className="no-scrollbar w-full min-w-0 overflow-x-auto overflow-y-hidden pb-2 overscroll-x-contain scroll-smooth"
      >
      <div className="flex gap-4 min-w-max px-1">
        {hours.map((hour, idx) => (
          <div key={idx} className="flex flex-col items-center gap-3 bg-white/5 rounded-[40px] px-5 py-6 min-w-[80px]">
            <span className="text-white/70 text-sm">
              {idx === 0 ? "Now" : format(new Date(hour.forecast_time), "HH:mm")}
            </span>
            <div className="text-2xl h-10 flex items-center justify-center">
              {hour.icon ? (
                <img src={`https://openweathermap.org/img/wn/${hour.icon}.png`} alt={hour.condition} className="w-10 h-10 opacity-80" />
              ) : (
                <Cloud className="w-7 h-7 text-white/70" />
              )}
            </div>
            <span className="text-[#D4FF00] font-medium text-lg">
              {hour.temperature !== undefined ? `${Math.round(hour.temperature)}°` : "-"}
            </span>
          </div>
        ))}
      </div>
      </div>
      <button
        type="button"
        onClick={() => scrollHours("right")}
        className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white/80 opacity-0 backdrop-blur-xl transition-opacity hover:text-[#D4FF00] group-hover:opacity-100 md:block"
        aria-label="Scroll hourly forecast right"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
