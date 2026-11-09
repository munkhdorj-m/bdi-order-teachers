import { notFound } from "next/navigation";
import { ProductImage } from "@/components/product-image";
import { CategoryIconTile, categoryVisual } from "@/lib/category-visual";
import { formatMnt } from "@/lib/format";
import { getProduct } from "@/lib/server/catalog";
import { getSettings } from "@/lib/server/settings";
import { cn } from "@/lib/utils";
import { ProductBuy } from "./product-buy";

/**
 * One product, as on BDI: big photo, name, price, stock, description, add
 * to cart. Open to everyone; signing in is only needed to order.
 */
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProduct(id), getSettings()]);
  if (!p) notFound();

  const visual = categoryVisual(p.category);
  const low = !p.sold_out && p.stock < 10;
  const stock = p.sold_out
    ? { label: "Дууссан", cls: "bg-danger-soft text-danger" }
    : low
      ? { label: `Цөөн үлдсэн · ${p.stock}`, cls: "bg-warn-soft text-warn" }
      : { label: "Бэлэн", cls: "bg-primary-soft text-primary-ink" };

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

        <div className="flex flex-col pb-28 md:py-2 md:pb-0">
          {p.category && (
            <span className={cn("mb-3 flex w-fit items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 text-[12px] font-semibold ring-1 ring-line", visual.tone.text)}>
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
          <div className="mt-3">
            <span className={cn("inline-flex h-7 items-center rounded-full px-3 text-[12.5px] font-bold", stock.cls)}>{stock.label}</span>
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

          {p.description && (
            <div className="mt-8 border-t border-line pt-6">
              <div className="eyebrow">Тайлбар</div>
              <p className="mt-2 whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-2">{p.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
