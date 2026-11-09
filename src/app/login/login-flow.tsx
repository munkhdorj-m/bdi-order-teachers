"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, Loader2, X } from "lucide-react";
import { BottomTabs } from "@/components/bottom-tabs";
import { InstallApp } from "@/components/install-app";
import { Logo } from "@/components/logo";
import { MenuButton } from "@/components/menu-drawer";
import { PinInput } from "@/components/pin-input";
import { Button } from "@/components/ui/button";
import { BDI_PATH, BDI_VIEWBOX } from "@/lib/brand";
import { formatPhone } from "@/lib/format";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { pinProblem } from "@/lib/pin-rules";
import { checkPhone, signIn, signUp } from "./actions";

type Step = "phone" | "pin" | "name" | "new-pin" | "repeat-pin";

/**
 * Sign in and sign up in one flow:
 *   phone → registered?  PIN (4 boxes, sends on the 4th digit)
 *                  new?  name → new PIN → repeat it
 * Desktop: a dark brand panel on the left, the form on the right.
 * Afterwards it goes to `next` (the cart, when someone was ordering).
 */
export function LoginFlow({ next = "/" }: { next?: string }) {
  // Closing goes back to a page that works signed out.
  const closeHref = next === "/cart" || next.startsWith("/products/") ? next : "/";
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [pending, start] = useTransition();

  function go(next: Step) {
    setError(null);
    setPin("");
    setStep(next);
  }

  function fail(message: string) {
    setError(message);
    setPin("");
    setShake((n) => n + 1);
  }

  function submitPhone(e: FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) return setError("8 оронтой утасны дугаар оруулна уу");
    start(async () => {
      const res = await checkPhone(phone);
      if ("error" in res) return setError(res.error);
      go(res.registered ? "pin" : "name");
    });
  }

  function submitPin(value: string) {
    start(async () => {
      const res = await signIn(phone, value, next);
      if (res?.error) fail(res.error);
    });
  }

  function submitName(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Нэрээ оруулна уу");
    go("new-pin");
  }

  function chooseNewPin(value: string) {
    const problem = pinProblem(value, phone);
    if (problem) return fail(problem);
    setNewPin(value);
    go("repeat-pin");
  }

  function repeatNewPin(value: string) {
    if (value !== newPin) {
      setStep("new-pin");
      setNewPin("");
      return fail("Таарсангүй. Дахин үүсгэнэ үү");
    }
    start(async () => {
      const res = await signUp(phone, name, value, next);
      if (res?.error) {
        setStep("new-pin");
        setNewPin("");
        fail(res.error);
      }
    });
  }

  const back = (to: Step) => (
    <button
      type="button"
      onClick={() => go(to)}
      disabled={pending}
      className="-ml-2 mb-6 flex items-center gap-1 rounded-full py-1.5 pr-3 pl-1.5 text-[14px] font-semibold text-ink-2 transition-colors hover:bg-muted hover:text-ink"
    >
      <ChevronLeft className="size-5" />
      <span className="tabular-nums">{formatPhone(phone)}</span>
    </button>
  );

  const errorLine = error && (
    <p role="alert" className="mt-4 text-[14px] font-semibold text-danger">
      {error}
    </p>
  );

  const spinner = pending && <Loader2 className="mt-5 size-6 animate-spin text-ink-3" />;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <BrandPanel />

      <main className="flex min-h-dvh flex-col px-5 pt-[max(1.75rem,env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-10 md:pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:px-16">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2.5 lg:hidden">
            <Logo size={40} />
            <span className="text-[18px] font-extrabold tracking-tight">
              BDI <span className="font-semibold text-ink-3">Дэлгүүр</span>
            </span>
          </Link>
          {/* Phones: the ☰ menu; wider screens: close back to the shop/cart. */}
          <MenuButton user={null} className="-mr-1 ml-auto" />
          <Link
            href={closeHref}
            aria-label="Хаах"
            className="ml-auto hidden size-10 place-items-center rounded-full bg-muted text-ink-2 transition-colors hover:bg-muted-strong hover:text-ink md:grid"
          >
            <X className="size-5" />
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {step === "phone" && (
            <form onSubmit={submitPhone} noValidate>
              <Title>Утасны дугаар</Title>
              <input
                className="field mt-6 h-14 rounded-2xl text-center text-[22px] font-bold tracking-[0.14em] shadow-card"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="8888 8888"
                aria-label="Утасны дугаар"
                autoFocus
                value={phone}
                onChange={(e) => {
                  setError(null);
                  setPhone(normalizePhone(e.target.value).slice(0, 8));
                }}
              />
              {errorLine}
              <Button type="submit" variant="primary" size="xl" className="mt-4 w-full" disabled={pending || phone.length !== 8}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                Үргэлжлүүлэх
                {!pending && <ArrowRight />}
              </Button>
            </form>
          )}

          {step === "pin" && (
            <div>
              {back("phone")}
              <Title>PIN код</Title>
              <div className="mt-6">
                <PinInput value={pin} onChange={setPin} onComplete={submitPin} disabled={pending} autoFocus shake={shake} />
              </div>
              {errorLine}
              {spinner}
              <p className="mt-10 text-[13px] font-medium text-ink-3">PIN мартсан бол админд хандана уу</p>
            </div>
          )}

          {step === "name" && (
            <form onSubmit={submitName} noValidate>
              {back("phone")}
              <Title>Таны нэр</Title>
              <input
                className="field mt-6 h-14 rounded-2xl text-[17px] shadow-card"
                autoComplete="name"
                aria-label="Нэр"
                placeholder="Нэр"
                maxLength={60}
                autoFocus
                value={name}
                onChange={(e) => {
                  setError(null);
                  setName(e.target.value);
                }}
              />
              {errorLine}
              <Button type="submit" variant="primary" size="xl" className="mt-4 w-full" disabled={name.trim().length < 2}>
                Үргэлжлүүлэх
                <ArrowRight />
              </Button>
            </form>
          )}

          {step === "new-pin" && (
            <div>
              {back("name")}
              <Title>PIN код үүсгэх</Title>
              <div className="mt-6">
                <PinInput value={pin} onChange={setPin} onComplete={chooseNewPin} disabled={pending} autoFocus shake={shake} />
              </div>
              {errorLine}
            </div>
          )}

          {step === "repeat-pin" && (
            <div>
              {back("name")}
              <Title>PIN кодоо давтана уу</Title>
              <div className="mt-6">
                <PinInput value={pin} onChange={setPin} onComplete={repeatNewPin} disabled={pending} autoFocus shake={shake} />
              </div>
              {errorLine}
              {spinner}
            </div>
          )}
        </div>

        <InstallApp variant="link" />
      </main>

      {/* Phones: the same menu as every other page, so nobody gets stuck here. */}
      <BottomTabs signedIn={false} />
    </div>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <h1 className="text-[28px] font-extrabold leading-tight">{children}</h1>;
}

/** Desktop only: dark panel with the brand glow and a large faint wordmark. */
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -left-32 size-[520px] rounded-full bg-primary/40 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -bottom-48 size-[480px] rounded-full bg-primary-bright/20 blur-[120px]" />
      <svg
        aria-hidden="true"
        viewBox={BDI_VIEWBOX}
        className="pointer-events-none absolute right-[-8%] bottom-[12%] w-[85%] -rotate-6 fill-white/[0.05]"
      >
        <path d={BDI_PATH} />
      </svg>
      <div className="relative flex items-center gap-3">
        <Logo size={44} />
        <span className="text-[20px] font-extrabold tracking-tight">
          BDI <span className="font-semibold text-white/55">Дэлгүүр</span>
        </span>
      </div>
    </aside>
  );
}
