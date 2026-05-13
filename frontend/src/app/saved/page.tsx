"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApi, getErrorMessage } from "@/lib/api";
import { SavedLocationRead } from "@/lib/types";
import { LocationWeatherDetail } from "@/components/weather/LocationWeatherDetail";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast, ToastState } from "@/components/ui/Toast";
import { CloudSun, Edit2, Trash2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SavedLocationsPage() {
  const [locations, setLocations] = useState<SavedLocationRead[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTag, setEditTag] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [mobileDetailId, setMobileDetailId] = useState<number | null>(null);
  const router = useRouter();

  const loadLocations = useCallback(async () => {
    try {
      const data = await fetchApi<SavedLocationRead[]>("/saved-locations");
      setLocations(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    window.setTimeout(() => {
      loadLocations();
    }, 0);
  }, [loadLocations]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (pendingDeleteId === null) return;
    try {
      await fetchApi(`/saved-locations/${pendingDeleteId}`, { method: "DELETE" });
      if (selectedId === pendingDeleteId) setSelectedId(null);
      if (mobileDetailId === pendingDeleteId) setMobileDetailId(null);
      setToast({ tone: "success", message: "Saved location removed." });
      setPendingDeleteId(null);
      loadLocations();
    } catch (err: unknown) {
      setToast({ tone: "error", message: getErrorMessage(err, "Failed to delete saved location") });
    }
  };

  const handleEditSave = async (id: number, e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/saved-locations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ tag: editTag })
      });
      setEditingId(null);
      setToast({ tone: "success", message: "Location tag updated." });
      loadLocations();
    } catch (err: unknown) {
      setToast({ tone: "error", message: getErrorMessage(err, "Failed to update saved location") });
    }
  };

  const navigateToWeather = (loc: SavedLocationRead) => {
    const params = new URLSearchParams({ lat: loc.latitude.toString(), lon: loc.longitude.toString() });
    router.push(`/?${params.toString()}`);
  };

  const detailLoc = locations.find(l => l.id === mobileDetailId);

  const renderLocationList = () => (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <div className="animate-pulse h-24 bg-white/10 rounded-2xl w-full"></div>
      ) : locations.length === 0 ? (
        <p className="text-white/50 py-8 text-center">No saved locations found.</p>
      ) : (
        locations.map((loc) => (
          <div
            key={loc.id}
            onClick={() => {
              setSelectedId(loc.id);
              setMobileDetailId(loc.id);
            }}
            className={`flex flex-col gap-3 p-5 rounded-[24px] cursor-pointer transition-all ${
              selectedId === loc.id ? "bg-white/20 ring-1 ring-[#D4FF00]" : "bg-white/5 hover:bg-white/10"
            }`}
          >
            <div className="flex justify-between items-start">
              {editingId === loc.id ? (
                <form onSubmit={(e) => handleEditSave(loc.id, e)} onClick={(e) => e.stopPropagation()} className="flex gap-2 w-full max-w-sm">
                  <input
                    type="text"
                    value={editTag}
                    onChange={e => setEditTag(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-[#D4FF00]"
                    autoFocus
                  />
                  <button type="submit" className="text-xs bg-[#D4FF00] text-black px-3 py-1 rounded-lg font-medium hover:bg-[#bce600]">Save</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg font-medium">Cancel</button>
                </form>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="font-bold text-[#D4FF00] text-lg">{loc.tag}</span>
                    <div className="flex items-center gap-1 text-white/80 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span className="text-sm">{loc.location_name} {loc.country ? `, ${loc.country}` : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigateToWeather(loc); }}
                      className="p-2 bg-white/10 hover:bg-[#D4FF00]/20 hover:text-[#D4FF00] rounded-full transition-colors text-white/70"
                      title="View weather"
                    >
                      <CloudSun className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditTag(loc.tag); setEditingId(loc.id); }}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white/70"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(loc.id, e)}
                      className="p-2 bg-white/10 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors text-white/70"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Remove saved location?"
        message="This removes the location from your library. Weather history records are not affected."
        confirmLabel="Remove"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />

      {detailLoc ? (
        <LocationWeatherDetail
          key={detailLoc.id}
          location={detailLoc}
          onBack={() => setMobileDetailId(null)}
          onBackgroundSaved={(generatedImageUrl) => {
            setLocations((current) =>
              current.map((loc) =>
                loc.id === detailLoc.id ? { ...loc, generated_image_url: generatedImageUrl } : loc
              )
            );
          }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-semibold">Saved Locations</h2>
          <p className="text-white/60 text-sm">Manage your library and tags</p>
          {renderLocationList()}
        </div>
      )}
    </>
  );
}
