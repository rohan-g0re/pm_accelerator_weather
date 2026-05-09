"use client";

import { useState } from "react";
import { Search, MapPin } from "lucide-react";

export function SearchBar({ onSearch, onGeolocate, isLoading }: { 
  onSearch: (q: string) => void;
  onGeolocate: () => void;
  isLoading: boolean;
}) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="flex w-full items-center gap-2">
      <form onSubmit={handleSubmit} className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-white/60" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city, ZIP, or coordinates..."
          className="w-full bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#D4FF00]/50 placeholder:text-white/50"
          disabled={isLoading}
        />
      </form>
      <button
        onClick={onGeolocate}
        disabled={isLoading}
        className="p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white/80 hover:text-[#D4FF00] hover:bg-white/20 transition-colors"
        title="Use My Location"
      >
        <MapPin className="h-5 w-5" />
      </button>
    </div>
  );
}