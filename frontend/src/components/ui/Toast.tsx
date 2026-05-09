"use client";

import { CheckCircle2, TriangleAlert, X } from "lucide-react";

type ToastTone = "success" | "error";

export interface ToastState {
  message: string;
  tone: ToastTone;
}

export function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  if (!toast) return null;

  const Icon = toast.tone === "success" ? CheckCircle2 : TriangleAlert;
  const toneClass = toast.tone === "success"
    ? "border-[#D4FF00]/60 bg-[#D4FF00]/15 text-[#D4FF00]"
    : "border-red-400/60 bg-red-500/15 text-red-100";

  return (
    <div className="fixed right-6 top-6 z-[80] max-w-sm">
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${toneClass}`}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm font-medium leading-5 text-white">{toast.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
