"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Keeps the service worker registered and refreshes the page when a reminder arrives or is logged
// from a notification while Bloom is open.
export function SwBridge() {
  const router = useRouter();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "bloom-refresh" || e.data?.type === "bloom-reminder") router.refresh();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);
  return null;
}
