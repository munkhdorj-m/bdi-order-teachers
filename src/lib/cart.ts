"use client";

import { useCallback, useSyncExternalStore } from "react";
import { giftQty, lineTotal, receivedQty, type Deal } from "@/lib/sale";

/**
 * The cart lives in this phone's localStorage (adapted from BDI's
 * lib/cart.ts). Prices here are only for showing a total: the server
 * prices every order again from the database.
 */
export type CartItem = {
  product_id: string;
  name: string;
  /** English name, shown when the page is in English. */
  name_en?: string | null;
  image_url: string | null;
  /** For the stand-in picture when there's no photo. */
  category_name: string | null;
  category_icon: string | null;
  unit_price: number;
  /**
   * Pieces the teacher pays for (by the piece or by the багц). Free pieces
   * from a «1+1» deal come on top of this: see giftQty().
   */
  qty: number;
  /** Pieces in one багц, when the product also comes as a багц (missing / 1 = none). */
  pack?: number;
  /** «1+1» / «2+1» deal: free pieces added on top. */
  deal?: Deal | null;
  /** Price of one piece before «-N%», for showing the saving. */
  was_price?: number | null;
};

export const MAX_QTY = 999;

/** The line's name in the reader's language. */
export function itemName(it: { name: string; name_en?: string | null }, lang: "mn" | "en"): string {
  return lang === "en" && it.name_en ? it.name_en : it.name;
}

// v2: `qty` is what the teacher pays for; deal pieces come on top.
// (In v1 a «1+1» line's qty counted the free pieces too.)
const KEY = "bdi-shop-cart-v2";
const OLD_KEY = "bdi-shop-cart-v1";
const EVENT = "bdi-shop-cart-change";

/** Once per device: bring a v1 cart over, taking the free pieces out of qty. */
function migrate() {
  try {
    const old = localStorage.getItem(OLD_KEY);
    if (old === null) return;
    if (localStorage.getItem(KEY) === null) {
      const items = JSON.parse(old) as CartItem[];
      const next = (Array.isArray(items) ? items : []).map((it) => {
        const d = it.deal;
        if (!d || d.buy < 1 || d.free < 1) return it;
        const freeBefore = Math.floor(it.qty / (d.buy + d.free)) * d.free;
        return { ...it, qty: Math.max(1, it.qty - freeBefore) };
      });
      localStorage.setItem(KEY, JSON.stringify(next));
    }
    localStorage.removeItem(OLD_KEY);
  } catch {
    /* storage blocked: nothing to bring over */
  }
}

if (typeof window !== "undefined") migrate();

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked: the cart just won't survive a reload */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Paid pieces, so that paid + free stays within one order line's 999. */
function clampQty(qty: number, deal?: Deal | null): number {
  let n = Math.max(0, Math.min(MAX_QTY, Math.floor(qty) || 0));
  while (n > 0 && receivedQty(n, deal) > MAX_QTY) n--;
  return n;
}

/** «1 багц + 2 ш» parts of a quantity, for showing it. */
export function packParts(qty: number, pack = 1): { packs: number; rest: number } {
  if (pack <= 1) return { packs: 0, rest: qty };
  return { packs: Math.floor(qty / pack), rest: qty % pack };
}

/** Set a product's quantity: adds it when new, removes it at 0. */
export function setQty(item: Omit<CartItem, "qty">, qty: number) {
  const n = clampQty(qty, item.deal);
  const items = read();
  const i = items.findIndex((x) => x.product_id === item.product_id);
  if (n === 0) {
    if (i >= 0) items.splice(i, 1);
  } else if (i >= 0) {
    items[i] = { ...items[i], ...item, qty: n };
  } else {
    items.push({ ...item, qty: n });
  }
  write(items);
}

/** Add n more of a product (reorder), on top of what's already there. */
export function addToCart(item: Omit<CartItem, "qty">, n: number) {
  const current = read().find((x) => x.product_id === item.product_id)?.qty ?? 0;
  setQty(item, current + n);
}

export function clearCart() {
  write([]);
}

/**
 * Bring a saved cart in line with today's prices (product_id → price of
 * everything orderable now): re-price changed lines, drop the rest.
 */
export function syncCartPrices(
  prices: Record<string, number>,
  packs: Record<string, number> = {},
  deals: Record<string, Deal> = {},
): { repriced: number; removed: string[] } {
  const items = read();
  let repriced = 0;
  let repacked = false;
  const removed: string[] = [];
  const next: CartItem[] = [];
  for (const it of items) {
    const price = prices[it.product_id];
    if (price === undefined) {
      removed.push(it.name);
      continue;
    }
    const pack = packs[it.product_id] ?? it.pack ?? 1;
    const deal = deals[it.product_id] ?? null;
    const qty = clampQty(it.qty, deal);
    if ((it.pack ?? 1) !== pack || qty !== it.qty || JSON.stringify(it.deal ?? null) !== JSON.stringify(deal)) repacked = true;
    if (Number(price) !== Number(it.unit_price)) repriced++;
    next.push({ ...it, unit_price: Number(price), pack, qty, deal });
  }
  if (repriced > 0 || removed.length > 0 || repacked) write(next);
  return { repriced, removed };
}

/** Pieces the teacher will receive, free ones included. */
export function cartCount(items: CartItem[]): number {
  return items.reduce((s, i) => s + receivedQty(i.qty, i.deal), 0);
}

/** Free pieces in the whole cart. */
export function cartGifts(items: CartItem[]): number {
  return items.reduce((s, i) => s + giftQty(i.qty, i.deal), 0);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + lineTotal(i.qty, i.unit_price), 0);
}

// ---- useCart: useSyncExternalStore over localStorage ------------------
// getSnapshot must return the same array while nothing changed, so the
// parsed value is cached against the raw JSON string.

const EMPTY: CartItem[] = [];
let cache: { raw: string | null; items: CartItem[] } = { raw: null, items: EMPTY };

function snapshot(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.items;
  let items = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : EMPTY;
    items = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    items = EMPTY;
  }
  cache = { raw, items };
  return items;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

/** Quantity of one product in the cart (0 when absent). */
export function useCartQty(productId: string): number {
  const get = useCallback(() => snapshot().find((i) => i.product_id === productId)?.qty ?? 0, [productId]);
  return useSyncExternalStore(subscribe, get, () => 0);
}
