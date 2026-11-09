import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { CategoryIconTile, categoryVisual } from "@/lib/category-visual";
import { describe } from "@/lib/describe";
import { formatMnt } from "@/lib/format";
import { getProduct } from "@/lib/server/catalog";
import { getSettings } from "@/lib/server/settings";
import { cn } from "@/lib/utils";
import { ProductBuy } from "./product-buy";

/**
 * One product, as on BDI: big photo, name, price, stock, add to cart. The
 * description is laid out to scan: what it is, its features as a checklist,
 * and a details table. Open to everyone; signing in is only needed to order.
 */
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProduct(id), getSettings()]);
  if (!p) notFound();

  const visual = categoryVisual(p.category);
  const low = !p.sold_out && !p.stockForced && p.stock < 10;
  const stock = p.sold_out
    ? { label: "Дууссан", cls: "bg-danger-soft text-danger" }
    : low
      ? { label: `Цөөн үлдсэн · ${p.stock}`, cls: "bg-warn-soft text-warn" }
      : { label: "Бэлэн", cls: "bg-primary-soft text-primary-ink" };
  const d = describe(p.description);

  const details: { label: string; value: string | null }[] = [
    { label: "Брэнд", value: p.brand },
    { label: "Ангилал", value: p.category?.name ?? null },
    { label: "Нэгж", value: p.unit ? `1 ${p.unit}` : null },
    { label: "Багцад", value: p.packSize ? `${p.packSize} ш` : null },
    { label: "Хайрцагт", value: p.boxCount ? `${p.boxCount} ш` : null },
    { label: "Код", value: p.sku },
    { label: "Үлдэгдэл", value: stock.label },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 pt-3 sm:px-6 lg:px-8 lg:pt-8">
      <div className="grid gap-5 md:grid-cols-2 md:gap-8 lg:gap-12">
        <div className="md:sticky md:top-[calc(4rem+2rem)] md:self-start">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-surface shadow-card ring-1 ring-black/5">
            <ProductImage
              src={p.image_url}
              alt={p.name}
              category={p.category}
              sizes="(max-width: 768px) 100vw, 560px"
              priority
              dim={p.sold_out}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col pb-28 md:py-2 md:pb-0">
          {p.category && (
            <span
              className={cn(
                "mb-3 flex w-fit items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 text-[12px] font-semibold ring-1 ring-line",
                visual.tone.text,
              )}
            >
              <CategoryIconTile visual={visual} size="xs" />
              {p.category.name}
            </span>
          )}
          {p.brand && <div className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-primary">{p.brand}</div>}
          <h1 className="mt-1 text-[22px] font-extrabold leading-tight md:text-[30px]">{p.name}</h1>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[28px] font-extrabold tracking-tight tabular-nums md:text-[34px]">{formatMnt(p.price)}</span>
            {p.unit && <span className="text-[14px] font-medium text-ink-3">/ {p.unit}</span>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Tag className={stock.cls}>{stock.label}</Tag>
            {d.extras.map((x) => (
              <Tag key={x} className="bg-muted text-ink-2">
                {x}
              </Tag>
            ))}
            {p.boxCount && <Tag className="bg-muted text-ink-2">Хайрцагт {p.boxCount} ш</Tag>}
          </div>

          <ProductBuy
            product={{
              product_id: p.id,
              name: p.name,
              image_url: p.image_url,
              category_name: p.category?.name ?? null,
              category_icon: p.category?.icon ?? null,
              unit_price: p.price,
            }}
            soldOut={p.sold_out}
            closed={!settings.open}
          />

          {d.summary && <p className="mt-8 text-[15.5px] leading-relaxed text-ink-2">{d.summary}</p>}

          {d.features.length > 0 && (
            <section className="mt-6">
              <h2 className="eyebrow">Онцлог</h2>
              <ul className="mt-3 space-y-3">
                {d.features.map((f, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-ink">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span className="text-[14.5px] leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <h2 className="eyebrow">Дэлгэрэнгүй</h2>
            <dl className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
              {details
                .filter((r): r is { label: string; value: string } => !!r.value)
                .map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-2.5 text-[14px]">
                    <dt className="font-medium text-ink-3">{r.label}</dt>
                    <dd className="min-w-0 truncate text-right font-semibold tabular-nums">{r.value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function Tag({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-7 items-center rounded-full px-3 text-[12.5px] font-bold", className)}>{children}</span>
  );
}
