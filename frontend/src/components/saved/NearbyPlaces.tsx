"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { SavedLocationRead, NearbyPlacesResponse } from "@/lib/types";
import { Coffee, Bed, Star } from "lucide-react";

export function NearbyPlaces({ location }: { location: SavedLocationRead }) {
  const [type, setType] = useState<"restaurant" | "hotel">("restaurant");
  const [data, setData] = useState<NearbyPlacesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPlaces = async () => {
      setIsLoading(true);
      try {
        const res = await fetchApi<NearbyPlacesResponse>(`/places/nearby?lat=${location.latitude}&lon=${location.longitude}&type=${type}`);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPlaces();
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
      ) : data?.configured === false ? (
        <div className="p-4 bg-white/5 rounded-2xl text-white/50 text-sm text-center">
          {data.message}
        </div>
      ) : data?.results.length === 0 ? (
        <div className="p-4 bg-white/5 rounded-2xl text-white/50 text-sm text-center">
          No places found nearby.
        </div>
      ) : (
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
          {data?.results.map((place, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-4 bg-black/40 rounded-2xl">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-white leading-tight pr-2">{place.name}</span>
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
      )}
    </div>
  );
}