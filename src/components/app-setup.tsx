"use client";

import { useEffect } from "react";
import { listenForInstallPrompt } from "@/lib/install-prompt";

/**
 * Runs once for every visitor: catches the "can be installed" event early,
 * and in production registers /sw.js (it caches only the app's own
 * content-hashed code, never pages or prices).
 */
export function AppSetup() {
  useEffect(() => {
    listenForInstallPrompt();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* unsupported or private mode: the site works without it */
    });
  }, []);
  return null;
}
