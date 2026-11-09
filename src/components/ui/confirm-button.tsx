"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { Sheet } from "./sheet";

/** A button that asks "sure?" before running `onConfirm`. */
export function ConfirmButton({
  question,
  confirmLabel = "Тийм",
  danger = false,
  variant = "secondary",
  size = "md",
  className,
  onConfirm,
  children,
}: {
  question: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  onConfirm: () => Promise<unknown>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant={variant} size={size} className={className} disabled={pending} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Sheet open={open} onOpenChange={(v) => !pending && setOpen(v)} title={question}>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" disabled={pending} onClick={() => setOpen(false)}>
            Үгүй
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            size="lg"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await onConfirm();
                setOpen(false);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
