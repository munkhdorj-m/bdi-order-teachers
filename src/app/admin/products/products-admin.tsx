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
import { dealLabel, dealText, percentOff } from "@/lib/sale";
import { dayLabel, ubDayKey } from "@/lib/ub-date";
import type { AdminProduct } from "@/lib/server/catalog";
import { searchNormalize } from "@/lib/translit";
import { cn } from "@/lib/utils";
import {
  packAllFromBdiAction,
  resetProductAction,
  saveProductAction,
  setProductHiddenAction,
  setProductSaleAction,
  setProductStockAction,
  type SaleInput,
  type StockMode,
} from "../actions";

type Filter = "all" | "shown" | "hidden" | "soldout" | "sale" | "edited";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Бүгд" },
  { key: "shown", label: "Харагдаж буй" },
  { key: "hidden", label: "Нуусан" },
  { key: "soldout", label: "Дууссан" },
  { key: "sale", label: "Хямдралтай" },
  { key: "edited", label: "Өөрчилсөн" },
];

const modeOf = (p: AdminProduct): StockMode =>
  p.setting?.soldOut == null ? "auto" : p.setting.soldOut ? "out" : "in";

type SaleType = SaleInput["type"];

const saleTypeOf = (p: AdminProduct): SaleType =>
  p.setting?.salePercent ? "percent" : p.setting?.saleBuy && p.setting?.saleFree ? "deal" : "none";

/** «−20%» / «2+1», and whether its last day has passed. */
function saleBadge(p: AdminProduct): { label: string; over: boolean } | null {
  const s = p.setting;
  const type = saleTypeOf(p);
  if (!s || type === "none") return null;
  const label = type === "percent" ? `−${s.salePercent}%` : dealLabel({ buy: s.saleBuy!, free: s.saleFree! });
  return { label, over: !!s.saleUntil && s.saleUntil < ubDayKey(new Date()) };
}

const isEdited = (p: AdminProduct) =>
  !!p.setting && (!!p.setting.name || p.setting.price != null || !!p.setting.description || p.setting.pack != null);

/**
 * Админ → Бараа: every BDI product. The switch shows it on the site or
 * hides it; the stock menu follows BDI's stock or says «Байгаа» /
 * «Дууссан»; the pencil sets this shop's own name, price and description
 * (empty = BDI's). BDI's own product data is never changed.
 */
export function ProductsAdmin({
  products,
  ready,
  soldOutReady,
  saleReady,
}: {
  products: AdminProduct[];
  ready: boolean;
  soldOutReady: boolean;
  saleReady: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  // Switch and stock menu change at once; the server catches up.
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [modes, setModes] = useState<Record<string, StockMode>>({});

  const [packing, startPacking] = useTransition();
  // BDI packs these, but this shop still sells them one by one.
  const packable = products.filter((p) => p.bdiPack && !p.setting?.pack);

  function packAll() {
    startPacking(async () => {
      const res = await packAllFromBdiAction();
      if (!res.ok) toast.error(res.error);
      else toast.success(`${res.count} барааг багцаар зарна`);
      router.refresh();
    });
  }

  const hidden = (p: AdminProduct) => flipped[p.id] ?? !!p.setting?.hidden;
  const mode = (p: AdminProduct) => modes[p.id] ?? modeOf(p);
  const soldOut = (p: AdminProduct) => {
    const m = mode(p);
    return m === "auto" ? p.stock <= 0 : m === "out";
  };
  const counts: Record<Filter, number> = {
    all: products.length,
    shown: products.filter((p) => !hidden(p)).length,
    hidden: products.filter((p) => hidden(p)).length,
    soldout: products.filter((p) => soldOut(p)).length,
    sale: products.filter((p) => saleBadge(p)).length,
    edited: products.filter(isEdited).length,
  };

  const q = searchNormalize(query);
  const shown = products.filter((p) => {
    const byFilter =
      filter === "all" ||
      (filter === "shown"
        ? !hidden(p)
        : filter === "hidden"
          ? hidden(p)
          : filter === "soldout"
            ? soldOut(p)
            : filter === "sale"
              ? !!saleBadge(p)
              : isEdited(p));
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

  async function setStock(p: AdminProduct, next: StockMode) {
    setModes((m) => ({ ...m, [p.id]: next }));
    const res = await setProductStockAction(p.id, next);
    if (!res.ok) {
      toast.error(res.error);
      setModes((m) => {
        const rest = { ...m };
        delete rest[p.id];
        return rest;
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

      {ready && packable.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-info-soft p-3.5 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-info text-white">
            <Package className="size-5" />
          </span>
          <div className="min-w-0 flex-1 text-[13px] font-medium text-ink-2">
            <div className="text-[14px] font-bold text-ink">BDI-д багцтай {packable.length} бараа ширхэгээр зарагдаж байна</div>
            Жишээ нь «{packable[0].name}» — 1 багц = {packable[0].bdiPack} ширхэг. Нэг товчоор бүгдийг багцаар зарж болно.
          </div>
          <Button variant="primary" size="lg" disabled={packing} onClick={packAll} className="shrink-0">
            {packing && <Loader2 className="animate-spin" />}
            Бүгдийг багцаар зарах
          </Button>
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState icon={<Package />} text="Бараа олдсонгүй" />
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {shown.map((p) => {
            const off = hidden(p);
            const sale = saleBadge(p);
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
                    <select
                      aria-label={`${p.name}: үлдэгдэл`}
                      value={mode(p)}
                      disabled={!ready || !soldOutReady}
                      onChange={(e) => setStock(p, e.target.value as StockMode)}
                      className={cn(
                        "h-6 cursor-pointer rounded-full px-1.5 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-default",
                        soldOut(p) ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary-ink",
                      )}
                    >
                      <option value="auto">Үлдэгдлээр · {Math.max(0, p.stock)} ш</option>
                      <option value="in">Байгаа</option>
                      <option value="out">Дууссан</option>
                    </select>
                    {sale && (
                      <Badge className={sale.over ? "bg-muted-strong text-ink-3 line-through" : "bg-danger text-white"}>
                        {sale.label}
                      </Badge>
                    )}
                    {p.setting?.pack != null && <Badge className="bg-info-soft text-info">Багц {p.setting.pack}ш</Badge>}
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
        {editing && (
          <EditProduct key={editing.id} product={editing} saleReady={saleReady} onDone={() => setEditing(null)} />
        )}
      </Sheet>
    </>
  );
}

function EditProduct({
  product: p,
  saleReady,
  onDone,
}: {
  product: AdminProduct;
  saleReady: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(p.setting?.name ?? "");
  const [price, setPrice] = useState(p.setting?.price != null ? String(p.setting.price) : "");
  const [description, setDescription] = useState(p.setting?.description ?? "");
  const [byPack, setByPack] = useState(p.setting?.pack != null);
  const [pack, setPack] = useState(String(p.setting?.pack ?? p.bdiPack ?? ""));
  const startType = saleTypeOf(p);
  const [saleType, setSaleType] = useState<SaleType>(startType);
  const [percent, setPercent] = useState(p.setting?.salePercent ? String(p.setting.salePercent) : "10");
  const [buy, setBuy] = useState(p.setting?.saleBuy ? String(p.setting.saleBuy) : "1");
  const [free, setFree] = useState(p.setting?.saleFree ? String(p.setting.saleFree) : "1");
  const [until, setUntil] = useState(p.setting?.saleUntil ?? "");
  const [pending, start] = useTransition();

  const sale: SaleInput = { type: saleType, percent, buy, free, until };
  const saleChanged =
    saleType !== startType ||
    (saleType === "percent" && Number(percent) !== p.setting?.salePercent) ||
    (saleType === "deal" && (Number(buy) !== p.setting?.saleBuy || Number(free) !== p.setting?.saleFree)) ||
    (saleType !== "none" && (until || null) !== (p.setting?.saleUntil ?? null));

  // What teachers will see, in plain words.
  const piece = price ? Number(price) : p.bdiPrice;
  const pct = Number(percent);
  const deal = { buy: Number(buy), free: Number(free) };
  const preview =
    saleType === "percent" && pct >= 1 && pct <= 90
      ? `−${pct}%` + (piece ? ` · ${formatMnt(piece)} → ${formatMnt(percentOff(piece, pct))}` : "")
      : saleType === "deal" && deal.buy >= 1 && deal.free >= 1
        ? `${dealLabel(deal)} · ${dealText(deal)}`
        : null;

  type Result = { ok: true } | { ok: false; error: string };
  const run = (action: () => Promise<Result>, done: string) =>
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

  const packN = Number(pack);
  const save = async (): Promise<Result> => {
    if (byPack && !(packN >= 2 && packN <= 500)) return { ok: false, error: "1 багцад хэдэн ширхэг байхыг бичнэ үү (2-500)" };
    const res = await saveProductAction(p.id, { name, price, description, pack: byPack ? pack : "" });
    if (!res.ok || !saleChanged) return res;
    return setProductSaleAction(p.id, sale);
  };

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
        <span className="label">Хэрхэн зарах</span>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Хэрхэн зарах">
          {(
            [
              [false, "Ширхэгээр"],
              [true, "Багцаар"],
            ] as [boolean, string][]
          ).map(([v, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={byPack === v}
              onClick={() => setByPack(v)}
              className={cn(
                "h-9 rounded-lg text-[12.5px] font-bold transition-colors",
                byPack === v ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {byPack && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[14px] font-semibold">
            <label htmlFor="p-pack">1 багц =</label>
            <input
              id="p-pack"
              className="field h-10 w-20 text-center tabular-nums"
              inputMode="numeric"
              value={pack}
              onChange={(e) => setPack(e.target.value.replace(/\D/g, "").slice(0, 3))}
            />
            <span>ширхэг</span>
            {p.bdiPack && packN !== p.bdiPack && (
              <button type="button" className="chip" onClick={() => setPack(String(p.bdiPack))}>
                BDI-ийнх: {p.bdiPack}ш
              </button>
            )}
          </div>
        )}
        <p className="mt-1.5 text-[12px] font-medium text-ink-3">
          {byPack && packN >= 2
            ? `Багш нар ${packN}, ${packN * 2}, ${packN * 3}… ширхэгээр захиална.` +
              (piece ? ` 1 багц = ${formatMnt(piece * packN)} (1ш ${formatMnt(piece)}).` : "")
            : "Багш нар 1 ширхэгээс захиална." + (p.bdiPack ? ` BDI-д ${p.bdiPack} ширхэгээр багцлагдсан.` : "")}
        </p>
      </div>
      <div>
        <label htmlFor="p-price" className="label">
          Үнэ, 1 ширхэг (₮)
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
      <section className="rounded-2xl p-3.5 ring-1 ring-line">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-bold">Хямдрал</span>
          {!saleReady && <span className="text-[11.5px] font-semibold text-warn">sql/08-sales.sql хэрэгтэй</span>}
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Хямдрал">
          {SALE_TYPES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={saleType === key}
              disabled={!saleReady}
              onClick={() => setSaleType(key)}
              className={cn(
                "h-9 rounded-lg text-[12.5px] font-bold transition-colors disabled:opacity-50",
                saleType === key ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {saleType === "percent" && (
          <div className="mt-3">
            <label htmlFor="s-pct" className="label">
              Хямдрал (%)
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {[10, 15, 20, 30, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="chip"
                  data-active={pct === n ? "" : undefined}
                  onClick={() => setPercent(String(n))}
                >
                  {n}%
                </button>
              ))}
              <input
                id="s-pct"
                className="field h-9 w-20 tabular-nums"
                inputMode="numeric"
                value={percent}
                onChange={(e) => setPercent(e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
            </div>
          </div>
        )}

        {saleType === "deal" && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1.5">
              {DEAL_PRESETS.map(([b, f]) => (
                <button
                  key={`${b}+${f}`}
                  type="button"
                  className="chip"
                  data-active={deal.buy === b && deal.free === f ? "" : undefined}
                  onClick={() => {
                    setBuy(String(b));
                    setFree(String(f));
                  }}
                >
                  {b}+{f}
                </button>
              ))}
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="s-buy" className="label">
                  Авах тоо
                </label>
                <input
                  id="s-buy"
                  className="field tabular-nums"
                  inputMode="numeric"
                  value={buy}
                  onChange={(e) => setBuy(e.target.value.replace(/\D/g, "").slice(0, 2))}
                />
              </div>
              <div>
                <label htmlFor="s-free" className="label">
                  Үнэгүй
                </label>
                <input
                  id="s-free"
                  className="field tabular-nums"
                  inputMode="numeric"
                  value={free}
                  onChange={(e) => setFree(e.target.value.replace(/\D/g, "").slice(0, 2))}
                />
              </div>
            </div>
            <p className="mt-1 text-[12px] font-medium text-ink-3">Ширхэгээр тоолно. Үнэгүй ширхэг захиалгад 0₮-өөр бичигдэнэ.</p>
          </div>
        )}

        {saleType !== "none" && (
          <>
            <div className="mt-3">
              <label htmlFor="s-until" className="label">
                Сүүлийн өдөр <span className="font-medium text-ink-3">(заавал биш)</span>
              </label>
              <input id="s-until" type="date" className="field" value={until} onChange={(e) => setUntil(e.target.value)} />
            </div>
            {preview && (
              <div className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-[13px] font-bold text-danger">
                Багш нар харах нь: {preview}
                {until && <span className="block text-[11.5px] font-semibold opacity-80">{dayLabel(until)} хүртэл</span>}
              </div>
            )}
          </>
        )}
      </section>

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
          onClick={() => run(save, "Хадгаллаа")}
        >
          {pending && <Loader2 className="animate-spin" />}
          Хадгалах
        </Button>
      </div>
    </div>
  );
}

const SALE_TYPES: [SaleType, string][] = [
  ["none", "Байхгүй"],
  ["percent", "Хувиар %"],
  ["deal", "1+1 гэх мэт"],
];

const DEAL_PRESETS: [number, number][] = [
  [1, 1],
  [2, 1],
  [3, 1],
];

function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-bold", className)}>{children}</span>
  );
}
