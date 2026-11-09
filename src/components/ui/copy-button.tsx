"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Older phones / no permission: the textarea trick.
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}

export function CopyButton({ value, className, dark = false }: { value: string; className?: string; dark?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await copyText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold transition-colors",
        dark
          ? done
            ? "bg-primary-bright text-white"
            : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20"
          : done
            ? "bg-primary-soft text-primary-ink"
            : "bg-muted text-ink-2 hover:bg-muted-strong hover:text-ink",
        className,
      )}
    >
      {done ? <Check className="size-3.5" strokeWidth={2.8} /> : <Copy className="size-3.5" strokeWidth={2.2} />}
      {done ? "Хуулсан" : "Хуулах"}
    </button>
  );
}
