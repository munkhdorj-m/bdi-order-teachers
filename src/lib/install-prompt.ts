"use client";

import { useSyncExternalStore } from "react";

/**
 * Chrome's "this site can be installed" event fires once, early, often
 * before the page showing the install button has mounted. Catch it here
 * (listenForInstallPrompt runs from the root layout) and hand it to
 * whichever button asks later.
 */
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let started = false;

export function listenForInstallPrompt() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useInstallPrompt(): InstallPromptEvent | null {
  return useSyncExternalStore(subscribe, () => deferred, () => null);
}

/** Show Chrome's own install dialog. True when the person said yes. */
export async function runInstallPrompt(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  await e.prompt();
  const choice = await e.userChoice;
  deferred = null;
  if (choice.outcome === "accepted") installed = true;
  emit();
  return choice.outcome === "accepted";
}

/** Already running as the installed app (or installed just now). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (installed) return true;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return (window.navigator as { standalone?: boolean }).standalone === true;
}

export type Platform = "ios" | "android" | "other";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  // iPadOS 13+ says "Macintosh"; touch points give it away.
  const ipad = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/.test(ua) || ipad) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}
