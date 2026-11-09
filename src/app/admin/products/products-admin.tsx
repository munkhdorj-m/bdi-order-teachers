"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Loader2, Package, Pencil, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/page-header";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { formatMnt } from "@/lib/format";
import type { AdminProduct } from "@/lib/server/catalog";
import { searchNormalize } from "@/lib/translit";
import { cn } from "@/lib/utils";
import { resetProductAction, saveProductAction, setProductHiddenAction } from "../actions";

type Filter = "all" | "shown" | "hidden" | "edited";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Бүгд" },
  { key: "shown", label: "Харагдаж буй" },
  { key: "hidden", label: "Нуусан" },
  { key: "edited", label: "Өөрчилсөн" },
];

const isEdited = (p: AdminProduct) =>
  !!p.setting && (!!p.setting.name || p.setting.price != null || !!p.setting.description);

/**
 * Админ → Бараа: every BDI product. The switch shows it on the site or
 * hides it; the pencil sets this shop's own name, price and description
 * (empty = BDI's). BDI's own product data is never changed.
 */
export function ProductsAdmin({ products, ready }: { products: AdminProduct[]; ready: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  // The switch flips at once; the server catches up.
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const hidden = (p: AdminProduct) => flipped[p.id] ?? !!p.setting?.hidden;
  const counts: Record<Filter, number> = {
    all: products.length,
    shown: products.filter((p) => !hidden(p)).length,
    hidden: products.filter((p) => hidden(p)).length,
    edited: products.filter(isEdited).length,
  };

  const q = searchNormalize(query);
  const shown = products.filter((p) => {
    const byFilter =
      filter === "all" || (filter === "shown" ? !hidden(p) : filter === "hidden" ? hidden(p) : isEdited(p));
    return byFilter && (!q || searchNormalize(`${p.name} ${p.bdiName} ${p.brand ?? ""}`).includes(q));
  });

  async function toggle(p: AdminProduct, show: boolean) {
    setFlipped((m) => ({ ...m, [p.id]: !show }));
    const res = await setProductHiddenAction(p.id, !show);
    if (!res.ok) {
      toast.error(res.error);
      setFlipped((m) => {
        const next = { ...m };
        delete next[p.id];
        return next;
      });
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" strokeWidth={2.2} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Бараа хайх"
            aria-label="Хайх"
            className="field h-11 pl-10"
          />
        </div>
        <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="chip"
              data-active={filter === f.key ? "" : undefined}
            >
              {f.label}
              <span className="tabular-nums opacity-60">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<Package />} text="Бараа олдсонгүй" />
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {shown.map((p) => {
            const off = hidden(p);
            return (
              <li key={p.id} className={cn("card flex items-center gap-3 p-3", off && "bg-muted/40")}>
                <span className="relative block size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <ProductImage src={p.image_url} alt={p.name} category={p.category} sizes="56px" small dim={off} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cn("line-clamp-2 text-[14px] font-semibold leading-snug", off && "text-ink-3")}>{p.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-ink-3">
                    <span className="font-bold text-ink tabular-nums">{p.price != null ? formatMnt(p.price) : "Үнэ алга"}</span>
                    {p.setting?.price != null && p.bdiPrice != null && (
                      <span className="line-through tabular-nums">{formatMnt(p.bdiPrice)}</span>
                    )}
                    {p.category && <span className="truncate">{p.category.name}</span>}
                    {p.stock <= 0 && <Badge className="bg-danger-soft text-danger">Дууссан</Badge>}
                    {isEdited(p) && <Badge className="bg-primary-soft text-primary-ink">Өөрчилсөн</Badge>}
                    {off && <Badge className="bg-muted-strong text-ink-2">Нуусан</Badge>}
                  </div>
                </div>
                <Switch
                  checked={!off}
                  onChange={(v) => toggle(p, v)}
                  label={`${p.name}: сайтад харуулах`}
                  disabled={!ready}
                />
                <button
                  type="button"
                  aria-label={`${p.name}: засах`}
                  onClick={() => setEditing(p)}
                  disabled={!ready}
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-muted hover:text-ink disabled:opacity-40"
                >
                  <Pencil className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={!!editing} onOpenChange={(v) => !v && setEditing(null)} title="Бараа засах" wide>
        {editing && <EditProduct key={editing.id} product={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}

function EditProduct({ product: p, onDone }: { product: AdminProduct; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(p.setting?.name ?? "");
  const [price, setPrice] = useState(p.setting?.price != null ? String(p.setting.price) : "");
  const [description, setDescription] = useState(p.setting?.description ?? "");
  const [pending, start] = useTransition();

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) =>
    start(async () => {
      const res = await action();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(done);
      router.refresh();
      onDone();
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
        <span className="relative block size-12 shrink-0 overflow-hidden rounded-xl bg-muted">
          <ProductImage src={p.image_url} alt={p.bdiName} category={p.category} sizes="48px" small />
        </span>
        <div className="min-w-0 text-[12.5px]">
          <div className="font-semibold text-ink-3">BDI</div>
          <div className="line-clamp-2 font-semibold">{p.bdiName}</div>
          <div className="font-bold tabular-nums">{p.bdiPrice != null ? formatMnt(p.bdiPrice) : "Үнэ алга"}</div>
        </div>
      </div>

      <div>
        <label htmlFor="p-name" className="label">
          Нэр
        </label>
        <input id="p-name" className="field" value={name} maxLength={200} placeholder={p.bdiName} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label htmlFor="p-price" className="label">
          Үнэ (₮)
        </label>
        <input
          id="p-price"
          className="field tabular-nums"
          inputMode="decimal"
          value={price}
          placeholder={p.bdiPrice != null ? String(p.bdiPrice) : ""}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
        />
      </div>
      <div>
        <label htmlFor="p-desc" className="label">
          Тайлбар
        </label>
        <textarea
          id="p-desc"
          className="field"
          rows={4}
          maxLength={4000}
          value={description}
          placeholder={p.bdiDescription ?? ""}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <p className="text-[12px] font-medium text-ink-3">
        Хоосон бол BDI-ийн утга харагдана. Тайлбарт «-»-ээр эхэлсэн мөр «Онцлог» жагсаалтад харагдана.
      </p>

      <div className="flex flex-wrap gap-2">
        {isEdited(p) && (
          <Button variant="ghost" size="lg" disabled={pending} onClick={() => run(() => resetProductAction(p.id), "BDI-ийн утга руу буцлаа")}>
            <RotateCcw />
            BDI-ийн утга
          </Button>
        )}
        <Button
          variant="primary"
          size="lg"
          className="min-w-40 flex-1"
          disabled={pending}
          onClick={() => run(() => saveProductAction(p.id, { name, price, description }), "Хадгаллаа")}
        >
          {pending && <Loader2 className="animate-spin" />}
          Хадгалах
        </Button>
      </div>
    </div>
  );
}

function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-bold", className)}>{children}</span>
  );
}
