"use client";
import { useStore } from "@/app/context/StoreProvider";

export default function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  const good = toast.type === "success";
  return (
    <div className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 sm:bottom-8">
      <div
        className={`animate-fade-up rounded-full px-5 py-3 text-sm font-medium shadow-lg ${
          good ? "bg-ink text-paper" : "bg-red-600 text-white"
        }`}
        role="status"
      >
        {toast.message}
      </div>
    </div>
  );
}
