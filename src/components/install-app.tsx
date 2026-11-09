"use client";

import { useState, type ReactNode } from "react";
import { Download, EllipsisVertical, Share, SquarePlus, X } from "lucide-react";
import { toast } from "sonner";
import { MenuRowContent, menuRowClass } from "@/components/menu-row";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { BRAND_GRADIENT } from "@/lib/brand";
import { detectPlatform, isStandalone, runInstallPrompt, useInstallPrompt, type Platform } from "@/lib/install-prompt";
import { useMounted } from "@/lib/use-mounted";

const DISMISS_KEY = "bdi-shop-install-dismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * "Install on your phone". Android with Chrome's prompt ready: one tap
 * shows Chrome's own install dialog. iPhone (no such prompt exists) and
 * the rest: a few short steps. Hidden once running as the installed app.
 *
 *   row     settings row (the Би page)
 *   banner  dismissible card on the shop, phones only
 *   link    small text button (sign-in page)
 */
export function InstallApp({ variant }: { variant: "row" | "banner" | "link" }) {
  const mounted = useMounted();
  const prompt = useInstallPrompt();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!mounted || isStandalone()) return null;
  const platform = detectPlatform();
  if (variant === "banner" && (dismissed || platform === "other")) return null;

  async function install() {
    if (prompt) {
      if (await runInstallPrompt()) toast.success("Суулгалаа");
      return;
    }
    setOpen(true);
  }

  const sheet = (
    <Sheet open={open} onOpenChange={setOpen} title="Утсандаа суулгах">
      <Steps platform={platform} />
    </Sheet>
  );

  if (variant === "banner") {
    return (
      <div className="card mb-4 flex items-center gap-3 p-3 lg:hidden">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundImage: BRAND_GRADIENT }}>
          <Download className="size-5" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1 text-[14px] font-semibold leading-tight">Утсандаа суулгах</span>
        <Button variant="brand" size="sm" onClick={install}>
          Суулгах
        </Button>
        <button
          type="button"
          aria-label="Хаах"
          className="-mr-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-muted hover:text-ink"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* fine: it just shows again next time */
            }
            setDismissed(true);
          }}
        >
          <X className="size-4" />
        </button>
        {sheet}
      </div>
    );
  }

  if (variant === "link") {
    return (
      <>
        <button
          type="button"
          onClick={install}
          className="mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold text-ink-3 transition-colors hover:bg-muted hover:text-ink"
        >
          <Download className="size-4" />
          Утсандаа суулгах
        </button>
        {sheet}
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={install} className={menuRowClass}>
        <MenuRowContent icon={<Download />} label="Утсандаа суулгах" />
      </button>
      {sheet}
    </>
  );
}

function Step({ n, icon, children }: { n: number; icon?: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-bold text-white">{n}</span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-[15px] font-semibold leading-snug">
        {children}
        {icon && (
          <span className="inline-grid size-7 place-items-center rounded-lg bg-muted text-ink ring-1 ring-line">{icon}</span>
        )}
      </span>
    </li>
  );
}

function Steps({ platform }: { platform: Platform }) {
  const list = "divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line";
  if (platform === "ios") {
    return (
      <ol className={list}>
        <Step n={1}>Safari-гаар нээнэ</Step>
        <Step n={2} icon={<Share className="size-4" />}>
          Доод талын
        </Step>
        <Step n={3} icon={<SquarePlus className="size-4" />}>
          «Add to Home Screen»
        </Step>
        <Step n={4}>«Add» дарна</Step>
      </ol>
    );
  }
  if (platform === "android") {
    return (
      <ol className={list}>
        <Step n={1} icon={<EllipsisVertical className="size-4" />}>
          Chrome-ийн цэс
        </Step>
        <Step n={2}>«Install app» эсвэл «Add to Home screen»</Step>
        <Step n={3}>«Install» дарна</Step>
      </ol>
    );
  }
  return (
    <div className="rounded-2xl p-4 text-[15px] font-semibold ring-1 ring-line">
      Утсаараа энэ хаягийг нээгээд суулгана уу:
      <div className="mt-2 break-all text-[16px] font-bold">{typeof window !== "undefined" ? window.location.host : ""}</div>
    </div>
  );
}
