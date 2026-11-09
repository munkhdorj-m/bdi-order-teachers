"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Bottom sheet on phones, a centred dialog on wider screens. */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-surface px-5 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-float outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:slide-out-to-bottom",
            "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6",
            "sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
            wide ? "sm:max-w-2xl" : "sm:max-w-md",
          )}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-strong sm:hidden" />
          <div className="mb-4 flex items-start justify-between gap-3">
            <Dialog.Title className="pt-1 text-[18px] font-bold leading-snug">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Хаах"
              className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full bg-muted text-ink-2 transition-colors hover:bg-muted-strong hover:text-ink"
            >
              <X className="size-[18px]" strokeWidth={2.2} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
