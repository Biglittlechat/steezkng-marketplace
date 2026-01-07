import { nanoid } from "nanoid";

export type CartItem = { id: string; productId: string; qty: number };

const LS_CART = "steezkng_cart_v1";
const BC_NAME = "steezkng_cart";

type CartMsg = { kind: "cart" };

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<CartItem[]>(localStorage.getItem(LS_CART), []);
}

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_CART, JSON.stringify(items));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BCAny: any = (window as any).BroadcastChannel;
  if (BCAny) {
    const bc = new BCAny(BC_NAME) as BroadcastChannel;
    bc.postMessage({ kind: "cart" } satisfies CartMsg);
    bc.close();
  }
}

function subscribe(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BCAny: any = (window as any).BroadcastChannel;
  const onStorage = (e: StorageEvent) => {
    if (e.key === LS_CART) handler();
  };
  window.addEventListener("storage", onStorage);

  if (!BCAny) return () => window.removeEventListener("storage", onStorage);

  const bc = new BCAny(BC_NAME) as BroadcastChannel;
  const onMsg = () => handler();
  bc.addEventListener("message", onMsg);

  return () => {
    window.removeEventListener("storage", onStorage);
    bc.removeEventListener("message", onMsg);
    bc.close();
  };
}

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export const cartStore = {
  get(): CartItem[] {
    return readCart();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    const off = subscribe(() => emit());
    return () => {
      listeners.delete(listener);
      off();
    };
  },

  add(productId: string, qty = 1) {
    const current = readCart();
    const idx = current.findIndex((i) => i.productId === productId);
    if (idx >= 0) {
      current[idx] = { ...current[idx], qty: current[idx].qty + qty };
    } else {
      current.push({ id: nanoid(), productId, qty });
    }
    writeCart(current);
    emit();
  },

  setQty(productId: string, qty: number) {
    const q = Math.max(1, Math.floor(qty));
    const current = readCart();
    const idx = current.findIndex((i) => i.productId === productId);
    if (idx === -1) return;
    current[idx] = { ...current[idx], qty: q };
    writeCart(current);
    emit();
  },

  remove(productId: string) {
    const next = readCart().filter((i) => i.productId !== productId);
    writeCart(next);
    emit();
  },

  clear() {
    writeCart([]);
    emit();
  },
};

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}