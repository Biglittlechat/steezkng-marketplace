import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cartStore, type CartItem } from "../lib/cart";
import { db, type Product } from "../lib/db";
import { NJ_TAX_RATE } from "../lib/tax";

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

export function CartPage() {
  const nav = useNavigate();
  const [cart, setCart] = useState<CartItem[]>(() => cartStore.get());
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => cartStore.subscribe(() => setCart(cartStore.get())), []);
  useEffect(() => {
    const off = db.subscribeProducts((p) => setProducts(p ?? []));
    return () => off();
  }, []);

  const lines = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return cart
      .map((c) => ({
        cart: c,
        product: byId.get(c.productId) ?? null,
      }))
      .filter((x) => !!x.product);
  }, [cart, products]);

  const subtotal = useMemo(() => {
    return lines.reduce((sum, l) => sum + (l.product?.price ?? 0) * l.cart.qty, 0);
  }, [lines]);

  const taxableAmount = useMemo(
    () => lines.reduce((sum, l) => {
      const price = l.product?.price ?? 0;
      if (price <= 0) return sum;
      return sum + price * l.cart.qty;
    }, 0),
    [lines]
  );

  const tax = taxableAmount * NJ_TAX_RATE;
  const total = subtotal + tax;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Your cart</h1>
            <p className="mt-2 text-sm text-slate-400">Cart persists via LocalStorage (reload-safe).</p>
          </div>
          <button
            type="button"
            onClick={() => cartStore.clear()}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Clear
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {lines.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-8 text-center text-sm text-slate-300">
              Cart is empty. <Link className="text-[#00f3ff] hover:underline" to="/">Browse products</Link>.
            </div>
          ) : (
            lines.map((l) => (
              <div
                key={l.cart.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Product Image Thumbnail */}
                  {l.product!.imageUrl && (
                    <div className="h-16 w-16 flex-shrink-0 rounded-xl border border-white/10 bg-black/50 overflow-hidden">
                      <img
                        src={l.product!.imageUrl}
                        alt={l.product!.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">{l.product!.title}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {l.product!.category} • {money(l.product!.price)}
                    </div>
                    {l.product!.stockCount === 0 ? (
                      <div className="mt-2 text-xs font-semibold text-rose-300">Now out of stock</div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5">
                    <button
                      type="button"
                      className="rounded-xl px-3 py-2 text-slate-200 hover:bg-white/10"
                      onClick={() => cartStore.setQty(l.cart.productId, Math.max(1, l.cart.qty - 1))}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="px-3 text-sm font-semibold text-slate-100">{l.cart.qty}</div>
                    <button
                      type="button"
                      className="rounded-xl px-3 py-2 text-slate-200 hover:bg-white/10"
                      onClick={() => cartStore.setQty(l.cart.productId, l.cart.qty + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="w-24 text-right text-sm font-semibold text-slate-100">
                    {money(l.product!.price * l.cart.qty)}
                  </div>

                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-200 transition hover:bg-white/10"
                    onClick={() => cartStore.remove(l.cart.productId)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="text-sm font-semibold text-slate-200">Order summary</div>
        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center justify-between text-slate-300">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-100">{money(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>NJ Sales Tax (6.625%)</span>
            <span className="font-semibold text-slate-100">{money(tax)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Delivery</span>
            <span>Instant (digital)</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-2 text-base font-semibold text-slate-100">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={lines.length === 0}
          onClick={() => nav("/checkout")}
          className={
            "mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition " +
            (lines.length === 0
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
              : "bg-[#00f3ff] text-black hover:brightness-110")
          }
        >
          Checkout
        </button>

        <p className="mt-4 text-xs text-slate-500">
          Checkout uses PayPal Standard (form post) for personal-account compatibility.
        </p>
      </aside>
    </div>
  );
}