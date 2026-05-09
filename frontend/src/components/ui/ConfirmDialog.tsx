"use client";

import { TriangleAlert } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/15 bg-[#0d1b33]/95 p-6 shadow-2xl">
        <div className="mb-5 flex items-start gap-4">
          <div className="rounded-2xl bg-[#D4FF00]/15 p-3 text-[#D4FF00]">
            <TriangleAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-[#D4FF00] px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#bce600]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
