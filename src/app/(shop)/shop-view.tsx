"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, SearchX, ShoppingCart, X } from "lucide-react";
import { CartBar, CartPanel } from "@/components/cart-widgets";
import { CatalogNav, sectionDomId, type CatalogNavItem } from "@/components/catalog-nav";
import { InstallApp } from "@/components/install-app";
import { EmptyState, Notice } from "@/components/page-header";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { setQty, useCart } from "@/lib/cart";
import { CategoryIconTile, USUAL_PRODUCTS_VISUAL, categoryVisual } from "@/lib/category-visual";
import { FOCUS_SEARCH_EVENT } from "@/lib/events";
import { formatMnt } from "@/lib/format";
import { searchNormalize } from "@/lib/translit";
import { cn } from "@/lib/utils";
import type { Category, Product } from "@/lib/server/catalog";

type Section = { id: string; name: string; icon: string | null; usual?: boolean; items: Product[] };

/**
 * The catalog, laid out like BDI's: «Өмнө авсан» first, then one section
 * per category with a rail (phones) or sidebar (desktop) to jump between
 * them. Typing in search switches to one flat list of matches (Latin or
 * Cyrillic). Wide screens keep the cart beside the products.
 */
export function ShopView({
  products,
  categories,
  usualIds,
  closedMessage,
}: {
  products: Product[];
  categories: Category[];
  usualIds: string[];
  closedMessage: string | null;
}) {
  const [query, setQueryState] = useState("");
  const mobileSearch = useRef<HTMLInputElement>(null);
  const items = useCart();

  const qtyById = useMemo(() => new Map(items.map((i) => [i.product_id, i.qty])), [items]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const index = useMemo(
    () => products.map((p) => ({ p, hay: searchNormalize(`${p.name} ${p.brand ?? ""}`) })),
    [products],
  );

  const sections = useMemo<Section[]>(() => {
    const groups = new Map<string, Product[]>();
    for (const p of products) {
      const key = p.category_id && catById.has(p.category_id) ? p.category_id : "other";
      const list = groups.get(key);
      if (list) list.push(p);
      else groups.set(key, [p]);
    }
    const byId = new Map(products.map((p) => [p.id, p]));
    const usual = usualIds.map((id) => byId.get(id)).filter((p): p is Product => !!p);
    return [
      ...(usual.length > 0 ? [{ id: "usual", name: "Өмнө авсан", icon: null, usual: true, items: usual }] : []),
      ...categories
        .filter((c) => groups.has(c.id))
        .map((c) => ({ id: c.id, name: c.name, icon: c.icon, items: groups.get(c.id)! })),
      ...(groups.has("other") ? [{ id: "other", name: "Бусад", icon: "other", items: groups.get("other")! }] : []),
    ];
  }, [products, categories, catById, usualIds]);

  const navItems = useMemo<CatalogNavItem[]>(
    () => sections.map((s) => ({ id: s.id, name: s.name, icon: s.icon, count: s.items.length, usual: s.usual })),
    [sections],
  );

  // The header's search button (phones) jumps to the box.
  useEffect(() => {
    const focus = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      mobileSearch.current?.focus({ preventScroll: true });
    };
    window.addEventListener(FOCUS_SEARCH_EVENT, focus);
    return () => window.removeEventListener(FOCUS_SEARCH_EVENT, focus);
  }, []);

  function setQuery(v: string) {
    // Starting a search from far down the page: show the results from the top.
    if (!query.trim() && v.trim()) window.scrollTo({ top: 0 });
    setQueryState(v);
  }

  const q = searchNormalize(query.trim());
  const results = q ? index.filter((x) => x.hay.includes(q)).map((x) => x.p) : [];
  const canOrder = !closedMessage;

  let shown = 0;
  const card = (p: Product, key: string, showCategory = false) => (
    <ProductCard
      key={key}
      product={p}
      category={p.category_id ? (catById.get(p.category_id) ?? null) : null}
      qty={qtyById.get(p.id) ?? 0}
      canOrder={canOrder}
      showCategory={showCategory}
      priority={shown++ < 4}
    />
  );

  const searchBox = (variant: "mobile" | "desktop") => (
    <SearchBox value={query} onChange={setQuery} variant={variant} inputRef={variant === "mobile" ? mobileSearch : undefined} />
  );

  return (
    <div className="mx-auto max-w-[1600px] px-3 pt-3 sm:px-6 lg:px-8 lg:pt-6">
      <div className="mb-3 lg:hidden">{searchBox("mobile")}</div>

      {/* Side columns stretch to the page height so their panels can stay in view. */}
      <div className="lg:flex lg:gap-8">
        {q ? (
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-[calc(4rem+1.5rem)]">{searchBox("desktop")}</div>
          </aside>
        ) : (
          <CatalogNav items={navItems} searchSlot={searchBox("desktop")} />
        )}

        <main className="min-w-0 flex-1 pb-24 xl:pb-6">
          {closedMessage && (
            <div className="mb-4">
              <Notice>{closedMessage}</Notice>
            </div>
          )}
          <InstallApp variant="banner" />

          {q ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-[13px]">
                  <span className="font-bold tabular-nums">{results.length}</span>
                  <span className="text-ink-3"> илэрц</span>
                </p>
                <Button variant="secondary" size="sm" onClick={() => setQuery("")}>
                  <X />
                  Бүх бараа
                </Button>
              </div>
              {results.length === 0 ? (
                <EmptyState icon={<SearchX />} text="Олдсонгүй" />
              ) : (
                <ProductGrid>{results.map((p) => card(p, p.id, true))}</ProductGrid>
              )}
            </>
          ) : sections.length === 0 ? (
            <EmptyState icon={<Search />} text="Бараа алга" />
          ) : (
            <div className="space-y-8">
              {sections.map((s) => {
                const visual = s.usual ? USUAL_PRODUCTS_VISUAL : categoryVisual(s);
                const titleId = `${sectionDomId(s.id)}-title`;
                return (
                  <section key={s.id} id={sectionDomId(s.id)} aria-labelledby={titleId}>
                    <header className="mb-3 flex items-center gap-2.5">
                      <CategoryIconTile visual={visual} size="md" />
                      <h2 id={titleId} className="min-w-0 truncate text-[17px] font-bold">
                        {s.name}
                      </h2>
                      <span className="text-[12px] font-semibold text-ink-3 tabular-nums">{s.items.length}</span>
                    </header>
                    <ProductGrid>{s.items.map((p) => card(p, `${s.id}:${p.id}`, !!s.usual))}</ProductGrid>
                  </section>
                );
              })}
            </div>
          )}
        </main>

        <aside className="hidden w-80 shrink-0 xl:block">
          <div className="sticky top-[calc(4rem+1.5rem)]">
            <CartPanel />
          </div>
        </aside>
      </div>

      <CartBar />
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  variant,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  variant: "mobile" | "desktop";
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const mobile = variant === "mobile";
  return (
    <div role="search" className="relative">
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-3",
          mobile ? "left-4 size-[18px]" : "left-3.5 size-4",
        )}
        strokeWidth={2.2}
      />
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Бараа хайх"
        aria-label="Бараа хайх"
        className={cn(
          "field pr-10 [&::-webkit-search-cancel-button]:hidden",
          mobile ? "h-12 rounded-2xl pl-11 shadow-card" : "h-11 pl-10 text-[14px]",
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Арилгах"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-muted hover:text-ink"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Columns follow the space the grid really has (container queries). */
function ProductGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-2 gap-2.5 @lg:grid-cols-3 @lg:gap-3 @2xl:grid-cols-4 @4xl:grid-cols-5 @6xl:grid-cols-6">
        {children}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  category,
  qty,
  canOrder,
  showCategory,
  priority,
}: {
  product: Product;
  category: Category | null;
  qty: number;
  canOrder: boolean;
  showCategory: boolean;
  priority: boolean;
}) {
  const visual = categoryVisual(category);
  const line = {
    product_id: product.id,
    name: product.name,
    image_url: product.image_url,
    category_name: category?.name ?? null,
    category_icon: category?.icon ?? null,
    unit_price: product.price,
  };

  return (
    <div
      data-in-cart={qty > 0 || undefined}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-lift data-[in-cart]:ring-2 data-[in-cart]:ring-primary/55"
    >
      <Link href={`/products/${product.id}`} className="flex flex-1 flex-col rounded-2xl focus-visible:outline-offset-[-2px]">
        <div className="relative aspect-[4/3.4] overflow-hidden bg-muted/60">
          <ProductImage
            src={product.image_url}
            alt={product.name}
            category={category}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 240px"
            priority={priority}
            dim={product.sold_out}
            className="transition-transform duration-500 ease-out md:group-hover:scale-[1.04]"
          />
          {qty > 0 && (
            <span
              key={qty}
              className="absolute top-2 right-2 z-[1] flex h-7 min-w-7 items-center justify-center gap-1 rounded-full bg-primary px-2 text-[12px] font-bold text-white tabular-nums shadow-md ring-2 ring-surface animate-in fade-in zoom-in-50 duration-300"
              aria-label={`Сагсанд ${qty} ширхэг`}
            >
              <ShoppingCart className="size-3.5" strokeWidth={2.4} />
              {qty}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 px-3 pt-2.5 pb-2">
          {showCategory && category && (
            <span className={cn("flex items-center gap-1 text-[11px] font-semibold", visual.tone.text)}>
              <CategoryIconTile visual={visual} size="xs" />
              <span className="truncate">{category.name}</span>
            </span>
          )}
          {product.brand && (
            <span className="truncate text-[10.5px] font-bold uppercase tracking-[0.08em] text-primary">{product.brand}</span>
          )}
          <h3 className="line-clamp-2 min-h-[2.5em] text-[13.5px] font-semibold leading-[1.25]">{product.name}</h3>
          <div className="mt-auto flex items-baseline gap-1 pt-0.5">
            <span className="text-[16px] font-extrabold tracking-tight tabular-nums">{formatMnt(product.price)}</span>
            {product.unit && <span className="text-[11.5px] font-medium text-ink-3">/{product.unit}</span>}
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3">
        {product.sold_out || !canOrder ? (
          <div className="grid h-10 select-none place-items-center rounded-xl bg-muted text-[12.5px] font-semibold text-ink-3">
            {product.sold_out ? "Дууссан" : "Хаалттай"}
          </div>
        ) : qty > 0 ? (
          <Stepper qty={qty} onChange={(n) => setQty(line, n)} label={`${product.name}: тоо`} />
        ) : (
          <button
            type="button"
            onClick={() => setQty(line, 1)}
            aria-label={`${product.name}: сагсанд нэмэх`}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary-soft text-[13.5px] font-bold text-primary-ink transition-colors hover:bg-primary hover:text-white active:scale-[0.98]"
          >
            <Plus className="size-4" strokeWidth={2.6} />
            Нэмэх
          </button>
        )}
      </div>
    </div>
  );
}
