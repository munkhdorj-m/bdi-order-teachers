import { getOrderable } from "@/lib/server/catalog";
import { getTeacher } from "@/lib/server/session";
import { CLOSED_DEFAULT, getSettings } from "@/lib/server/settings";
import { CartView } from "./cart-view";

/** Anyone can fill a cart; ordering asks to sign in first. */
export default async function CartPage() {
  const [me, { prices, packs, deals }, settings] = await Promise.all([getTeacher(), getOrderable(), getSettings()]);
  return (
    <CartView
      prices={prices}
      packs={packs}
      deals={deals}
      signedIn={!!me}
      closedMessage={settings.open ? null : settings.closed_message || CLOSED_DEFAULT}
    />
  );
}
