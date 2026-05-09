"use client";

import { useState, useEffect, useRef } from "react";
import { fetchApi, getErrorMessage } from "@/lib/api";
import { NearbyPlacesResponse } from "@/lib/types";
import { Coffee, Bed, ChevronDown, ExternalLink, Star } from "lucide-react";

interface NearbyPlacesLocation {
  location_name: string;
  latitude: number;
  longitude: number;
}

export function NearbyPlaces({ location }: { location: NearbyPlacesLocation }) {
  const [type, setType] = useState<"restaurant" | "hotel">("restaurant");
  const [data, setData] = useState<NearbyPlacesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollPlaces = () => {
    scrollerRef.current?.scrollBy({
      top: 260,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    let isCurrentRequest = true;

    const loadPlaces = async () => {
      setIsLoading(true);
      setData(null);
      setError(null);
      try {
        const res = await fetchApi<NearbyPlacesResponse>(`/places/nearby?lat=${location.latitude}&lon=${location.longitude}&type=${type}`);
        if (isCurrentRequest) {
          setData(res);
        }
      } catch (err) {
        console.error(err);
        if (isCurrentRequest) {
          setError(getErrorMessage(err, "Failed to load nearby places"));
        }
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      }
    };
    loadPlaces();

    return () => {
      isCurrentRequest = false;
    };
  }, [location.latitude, location.longitude, type]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold">Explore spots around {location.location_name}</h3>
        <p className="text-white/60 text-sm">Discover popular places nearby.</p>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => setType("restaurant")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${type === "restaurant" ? "bg-[#D4FF00] text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
        >
          <Coffee className="w-4 h-4" /> Restaurants
        </button>
        <button 
          onClick={() => setType("hotel")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${type === "hotel" ? "bg-[#D4FF00] text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
        >
          <Bed className="w-4 h-4" /> Hotels
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-20 bg-white/10 rounded-2xl w-full"></div>
          <div className="h-20 bg-white/10 rounded-2xl w-full"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-2xl text-red-100 text-sm text-center">
          {error}
        </div>
      ) : data?.configured === false ? (
        <div className="p-4 bg-white/5 rounded-2xl text-white/50 text-sm text-center">
          {data.message}
        </div>
      ) : data?.results.length === 0 ? (
        <div className="p-4 bg-white/5 rounded-2xl text-white/50 text-sm text-center">
          No places found nearby.
        </div>
      ) : (
        <div className="group relative">
          <div
            ref={scrollerRef}
            className="no-scrollbar flex max-h-[500px] flex-col gap-4 overflow-y-auto scroll-smooth pr-1 pb-14"
          >
            {data?.results.map((place, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-4 bg-black/40 rounded-2xl">
                <div className="flex justify-between items-start">
                  {place.google_maps_url ? (
                    <a
                      href={place.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="group/link flex items-center gap-1.5 pr-2 font-semibold leading-tight text-white transition-colors hover:text-[#D4FF00] focus:outline-none focus-visible:text-[#D4FF00]"
                    >
                      {place.name}
                      <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover/link:opacity-80 group-focus-visible/link:opacity-80" />
                    </a>
                  ) : (
                    <span className="font-semibold text-white leading-tight pr-2">{place.name}</span>
                  )}
                  {place.rating !== undefined && (
                    <div className="flex items-center gap-1 text-[#D4FF00] text-xs font-bold shrink-0">
                      <Star className="w-3 h-3 fill-current" /> {place.rating}
                    </div>
                  )}
                </div>
                <span className="text-white/50 text-xs">{place.address}</span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-2xl bg-gradient-to-t from-[#0f1f35] via-[#0f1f35]/80 to-transparent" />
          <button
            type="button"
            onClick={scrollPlaces}
            className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/20 bg-black/60 p-2 text-white/80 backdrop-blur-xl transition-colors hover:text-[#D4FF00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4FF00]"
            aria-label="Scroll nearby places"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
