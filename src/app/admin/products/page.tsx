import { Notice } from "@/components/page-header";
import { listProductsForAdmin } from "@/lib/server/catalog";
import { getT } from "@/lib/server/lang";
import { requireAdmin } from "@/lib/server/session";
import { ProductsAdmin } from "./products-admin";

/** Every BDI product: show it on the site or not, and this shop's name / price / description. */
export default async function AdminProductsPage() {
  await requireAdmin();
  const [{ products, ready, soldOutReady, saleReady }, t] = await Promise.all([
    listProductsForAdmin(),
    getT(),
  ]);
  return (
    <>
      {!ready && (
        <div className="mb-4">
          <Notice>
            {t(
              "Эхлээд Supabase-д sql/04-product-settings.sql-ийг ажиллуулна уу",
              "First run sql/04-product-settings.sql in Supabase",
            )}
          </Notice>
        </div>
      )}
      {ready && !soldOutReady && (
        <div className="mb-4">
          <Notice>
            {t(
              "«Байгаа / Дууссан»-г сонгохын тулд sql/05-product-sold-out.sql-ийг ажиллуулна уу",
              "To set «In stock / Sold out», run sql/05-product-sold-out.sql",
            )}
          </Notice>
        </div>
      )}
      <ProductsAdmin
        products={products}
        ready={ready}
        soldOutReady={soldOutReady}
        saleReady={saleReady}
      />
    </>
  );
}
