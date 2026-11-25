"use client";

import { useCallback, useSyncExternalStore } from "react";
import { lineTotal, type Deal } from "@/lib/sale";

/**
 * The cart lives in this phone's localStorage (adapted from BDI's
 * lib/cart.ts). Prices here are only for showing a total: the server
 * prices every order again from the database.
 */
export type CartItem = {
  product_id: string;
  name: string;
  image_url: string | null;
  /** For the stand-in picture when there's no photo. */
  category_name: string | null;
  category_icon: string | null;
  unit_price: number;
  /** Pieces. Always a multiple of `pack` when the product is sold by the багц. */
  qty: number;
  /** Багц size (missing / 1 = by the piece). */
  pack?: number;
  /** «2+1»-style deal: some pieces are free. */
  deal?: Deal | null;
  /** Price of one piece before «-N%», for showing the saving. */
  was_price?: number | null;
};

export const MAX_QTY = 999;

const KEY = "bdi-shop-cart-v1";
const EVENT = "bdi-shop-cart-change";

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

/** Set a product's quantity: adds it when new, removes it at 0. */
/** Round to whole багцs (up), within the 999-piece limit. */
function packed(qty: number, pack = 1): number {
  const p = pack > 1 ? pack : 1;
  const max = Math.floor(MAX_QTY / p) * p;
  return Math.max(0, Math.min(max, Math.ceil(Math.floor(qty) / p) * p));
}

export function setQty(item: Omit<CartItem, "qty">, qty: number) {
  const n = packed(qty, item.pack);
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
    const qty = packed(it.qty, pack);
    const deal = deals[it.product_id] ?? null;
    if ((it.pack ?? 1) !== pack || qty !== it.qty || JSON.stringify(it.deal ?? null) !== JSON.stringify(deal)) repacked = true;
    if (Number(price) !== Number(it.unit_price)) repriced++;
    next.push({ ...it, unit_price: Number(price), pack, qty, deal });
  }
  if (repriced > 0 || removed.length > 0 || repacked) write(next);
  return { repriced, removed };
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.qty, 0);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + lineTotal(i.qty, i.unit_price, i.deal), 0);
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
