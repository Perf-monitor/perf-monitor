"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toastQueue: Toast[] = [];

export function toast(t: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2);
  toastQueue = [...toastQueue, { ...t, id }];
  toastListeners.forEach((l) => l(toastQueue));

  const duration = t.duration ?? 4000;
  setTimeout(() => {
    toastQueue = toastQueue.filter((x) => x.id !== id);
    toastListeners.forEach((l) => l(toastQueue));
  }, duration);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToasts);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all",
            t.variant === "destructive"
              ? "bg-destructive text-destructive-foreground border-destructive"
              : t.variant === "success"
              ? "bg-green-600 text-white border-green-700"
              : "bg-card text-card-foreground border-border"
          )}
        >
          <p className="font-semibold text-sm">{t.title}</p>
          {t.description && <p className="text-xs mt-0.5 opacity-80">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}
