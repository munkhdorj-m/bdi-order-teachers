"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MenuRowContent, menuRowClass } from "@/components/menu-row";
import { PinInput } from "@/components/pin-input";
import { Sheet } from "@/components/ui/sheet";
import { changePin } from "./actions";

type Step = "current" | "new" | "repeat";

const TITLES: Record<Step, string> = {
  current: "Одоогийн PIN",
  new: "Шинэ PIN",
  repeat: "Шинэ PIN-ээ давтана уу",
};

export function ChangePin() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("current");
  const [value, setValue] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [pending, start] = useTransition();

  function reset() {
    setStep("current");
    setValue("");
    setCurrent("");
    setNext("");
    setError(null);
  }

  function fail(message: string, back: Step) {
    setError(message);
    setValue("");
    setStep(back);
    setShake((n) => n + 1);
  }

  function complete(v: string) {
    setError(null);
    if (step === "current") {
      setCurrent(v);
      setValue("");
      setStep("new");
    } else if (step === "new") {
      setNext(v);
      setValue("");
      setStep("repeat");
    } else if (v !== next) {
      fail("Таарсангүй. Дахин оролдоно уу", "new");
    } else {
      start(async () => {
        const res = await changePin(current, v);
        if (res.ok) {
          // No reset here: the sheet is still fading out. Opening it resets.
          toast.success("PIN солигдлоо");
          setOpen(false);
        } else {
          fail(res.error, res.step);
        }
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className={menuRowClass}
      >
        <MenuRowContent icon={<KeyRound />} label="PIN солих" />
      </button>
      <Sheet open={open} onOpenChange={(v) => !pending && setOpen(v)} title={TITLES[step]}>
        <div className="flex flex-col items-center pb-2">
          <PinInput key={step} value={value} onChange={setValue} onComplete={complete} disabled={pending} autoFocus shake={shake} />
          {error && (
            <p role="alert" className="mt-4 text-center text-[14px] font-semibold text-danger">
              {error}
            </p>
          )}
          {pending && <Loader2 className="mt-4 size-6 animate-spin text-ink-3" />}
        </div>
      </Sheet>
    </>
  );
}
