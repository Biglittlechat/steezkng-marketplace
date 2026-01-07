import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ShieldCheck, CreditCard, Smartphone, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cartStore, type CartItem } from "../lib/cart";
import { db, type Product } from "../lib/db";

const MERCHANT_EMAIL = "thebiglittlefarmer@gmail.com";
const CASHAPP_LINK = "https://cash.app/$Dillinger67?qr=1";
const CASHAPP_TAG = "$Dillinger67";

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

type PaymentMethod = "paypal" | "cashapp";

export function CheckoutPage() {
  const nav = useNavigate();

  const [cart, setCart] = useState<CartItem[]>(() => cartStore.get());
  const [products, setProducts] = useState<Product[]>([]);

  const [email, setEmail] = useState<string>("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paypal");

  // CashApp flow
  const [showCashAppModal, setShowCashAppModal] = useState(false);
  const [cashAppConfirmed, setCashAppConfirmed] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(
    () => cartStore.subscribe(() => setCart(cartStore.get())),
    []
  );

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
      .filter((x) => !!x.product)
      .map((x) => ({ cart: x.cart, product: x.product! }));
  }, [cart, products]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.product.price * l.cart.qty, 0),
    [lines]
  );

  const NJ_TAX_RATE = 0.06625;
  const taxableSubtotal = useMemo(
    () =>
      lines.reduce(
        (sum, l) =>
          l.product.price > 0 ? sum + l.product.price * l.cart.qty : sum,
        0
      ),
    [lines]
  );
  const tax = useMemo(() => taxableSubtotal * NJ_TAX_RATE, [taxableSubtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const canCheckout =
    lines.length > 0 &&
    !!email.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    agreed &&
    !submitting;

  // SIMPLE: build a basic PayPal URL and redirect
  function goToPayPalSimple() {
    const params = new URLSearchParams();
    params.set("cmd", "_xclick");
    params.set("business", MERCHANT_EMAIL);
    params.set("currency_code", "USD");
    params.set("amount", total.toFixed(2));
    params.set("item_name", "steezkng Order");
    params.set("return", `${origin}/success`);
    params.set("cancel_return", `${origin}/cart`);
    const url = "https://www.paypal.com/cgi-bin/webscr?" + params.toString();
    window.location.href = url;
  }

  async function handleCheckout() {
    if (!canCheckout) return;

    // Basic stock validation
    for (const l of lines) {
      if (l.product.stockCount <= 0) {
        alert(`"${l.product.title}" is out of stock.`);
        return;
      }
      if (l.cart.qty > l.product.stockCount) {
        alert(
          `Not enough stock for "${l.product.title}" (requested ${l.cart.qty}, available ${l.product.stockCount}).`
        );
        return;
      }
    }

    setSubmitting(true);

    if (paymentMethod === "paypal") {
      try {
        // Create a simple order record so we have something to look up later
        const order = await db.createOrder(
          email.trim(),
          lines.map((l) => ({ product: l.product, qty: l.cart.qty })),
          "paypal"
        );
        setOrderId(order.id);
        localStorage.setItem("steezkng_last_order_id", order.id);
      } catch (e) {
        console.error(e);
        alert("Failed to create order (PayPal). Continuing to PayPal anyway.");
      }

      goToPayPalSimple();
      return;
    }

    // CashApp flow
    try {
      const order = await db.createOrder(
        email.trim(),
        lines.map((l) => ({ product: l.product, qty: l.cart.qty })),
        "cashapp"
      );
      setOrderId(order.id);
      localStorage.setItem("steezkng_last_order_id", order.id);
      setShowCashAppModal(true);
    } catch (e) {
      console.error(e);
      alert("Failed to create order (CashApp).");
      setSubmitting(false);
    }
  }

  function handleCashAppComplete() {
    nav(`/success?orderId=${orderId ?? ""}`);
  }

  // IMPORTANT: We removed the auto-redirect that was sending you back to /cart
  // useEffect(() => {
  //   if (lines.length === 0 && !showCashAppModal) nav("/cart");
  // }, [lines.length, nav, showCashAppModal]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      {/* LEFT: main checkout form */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Checkout</h1>
            <p className="mt-2 text-sm text-slate-400">
              Choose PayPal or CashApp to complete your purchase.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
            <Lock className="h-4 w-4 text-[#00f3ff]" /> Secure flow
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-semibold text-slate-300">Email (receipt + delivery)</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600"
            />
          </label>

          {/* Payment Method Selection */}
          <div className="grid gap-2">
            <span className="text-xs font-semibold text-slate-300">Payment Method</span>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("paypal")}
                className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                  paymentMethod === "paypal"
                    ? "border-[#00f3ff]/50 bg-[#00f3ff]/10"
                    : "border-white/10 bg-black/30 hover:bg-white/5"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    paymentMethod === "paypal" ? "bg-blue-500" : "bg-blue-500/50"
                  }`}
                >
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-slate-100">PayPal</div>
                  <div className="text-xs text-slate-400">Card or PayPal balance</div>
                </div>
                {paymentMethod === "paypal" && (
                  <Check className="ml-auto h-5 w-5 text-[#00f3ff]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("cashapp")}
                className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                  paymentMethod === "cashapp"
                    ? "border-[#00f3ff]/50 bg-[#00f3ff]/10"
                    : "border-white/10 bg-black/30 hover:bg-white/5"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    paymentMethod === "cashapp" ? "bg-green-500" : "bg-green-500/50"
                  }`}
                >
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-slate-100">CashApp</div>
                  <div className="text-xs text-slate-400">Scan QR or send direct</div>
                </div>
                {paymentMethod === "cashapp" && (
                  <Check className="ml-auto h-5 w-5 text-[#00f3ff]" />
                )}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#00f3ff]"
            />
            <span className="text-sm text-slate-300">
              <span className="font-semibold text-slate-100">I confirm I am 18+</span> and agree that all
              digital sales are final. I acknowledge that I am purchasing a digital service/asset.
            </span>
          </label>

          {paymentMethod === "paypal" && (
            <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4 text-sm text-blue-200">
              <span className="font-semibold">PayPal Guest Checkout:</span> Look for{" "}
              <span className="font-semibold">"Pay with Debit or Credit Card"</span> on PayPal's page if you
              don't have an account.
            </div>
          )}

          {paymentMethod === "cashapp" && (
            <div className="rounded-2xl border border-green-500/25 bg-green-500/10 p-4 text-sm text-green-200">
              <span className="font-semibold">CashApp:</span> Send payment to{" "}
              <span className="font-semibold">{CASHAPP_TAG}</span>. Include your order ID in the note for
              faster processing.
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!canCheckout}
          onClick={() => void handleCheckout()}
          className={
            "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition " +
            (!canCheckout
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
              : "bg-[#00f3ff] text-black hover:brightness-110")
          }
        >
          {paymentMethod === "paypal"
            ? submitting
              ? "Redirecting to PayPal…"
              : `Pay ${money(total)} with PayPal (incl. NJ tax)`
            : submitting
              ? "Processing…"
              : `Pay ${money(total)} with CashApp`}
        </button>

        <button
          type="button"
          onClick={() => nav("/cart")}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
        >
          Back to cart
        </button>
      </section>

      {/* RIGHT: order review */}
      <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-200">Order review</div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Delivery after verification
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {lines.map((l) => (
            <div
              key={l.product.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-100">
                  {l.product.title}
                </div>
                <div className="mt-1 text-xs text-slate-500">Qty {l.cart.qty}</div>
              </div>
              <div className="text-sm font-semibold text-slate-100">
                {money(l.product.price * l.cart.qty)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-100">{money(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>NJ Sales Tax</span>
            <span className="font-semibold text-slate-100">{money(tax)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-2">
            <span className="text-slate-300">Total</span>
            <span className="text-base font-semibold text-slate-100">
              {money(total)}
            </span>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          All payments go to steezkng. Stock is decremented only after payment verification.
        </p>
      </aside>

      {/* CashApp Modal */}
      {showCashAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0a0a] p-6">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500">
                <Smartphone className="h-8 w-8 text-white" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-100">Pay with CashApp</h2>
              <p className="mt-2 text-sm text-slate-400">
                Scan the QR code or send {money(total)} to{" "}
                <span className="font-semibold text-green-400">{CASHAPP_TAG}</span>
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="rounded-2xl bg-white p-4">
                <QRCodeSVG
                  value={CASHAPP_LINK}
                  size={200}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs font-semibold text-slate-300">Payment Details</div>
              <div className="mt-2 grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="font-semibold text-green-400">{money(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Send to:</span>
                  <span className="font-semibold text-slate-100">{CASHAPP_TAG}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Order ID:</span>
                  <span className="font-mono text-xs text-slate-300">
                    {orderId ?? "(pending)"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Include your Order ID in the CashApp note for faster verification.
              </p>
            </div>

            <a
              href={CASHAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block w-full rounded-2xl bg-green-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-600"
            >
              Open CashApp
            </a>

            <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
              <input
                type="checkbox"
                checked={cashAppConfirmed}
                onChange={(e) => setCashAppConfirmed(e.target.checked)}
                className="h-4 w-4 accent-green-500"
              />
              <span className="text-sm text-slate-300">
                I have sent {money(total)} to {CASHAPP_TAG}
              </span>
            </label>

            <button
              type="button"
              disabled={!cashAppConfirmed}
              onClick={handleCashAppComplete}
              className={
                "mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition " +
                (!cashAppConfirmed
                  ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
                  : "bg-[#00f3ff] text-black hover:brightness-110")
              }
            >
              I've Completed Payment
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCashAppModal(false);
                setSubmitting(false);
              }}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}