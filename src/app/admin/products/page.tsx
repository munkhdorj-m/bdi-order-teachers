import { Notice } from "@/components/page-header";
import { listProductsForAdmin } from "@/lib/server/catalog";
import { requireAdmin } from "@/lib/server/session";
import { ProductsAdmin } from "./products-admin";

/** Every BDI product: show it on the site or not, and this shop's name / price / description. */
export default async function AdminProductsPage() {
  await requireAdmin();
  const { products, ready } = await listProductsForAdmin();
  return (
    <>
      {!ready && (
        <div className="mb-4">
          <Notice>Эхлээд Supabase-д sql/04-product-settings.sql-ийг ажиллуулна уу</Notice>
        </div>
      )}
      <ProductsAdmin products={products} ready={ready} />
    </>
  );
}
