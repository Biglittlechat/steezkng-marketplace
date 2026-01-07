import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Zap, PackageCheck, PackageX, Filter, ChevronDown, HelpCircle, X, Mail } from "lucide-react";
import { db, type Product } from "../lib/db";
import { cartStore } from "../lib/cart";

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

export function ShopPage() {
  const nav = useNavigate();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [freeClaimProduct, setFreeClaimProduct] = useState<Product | null>(null);

  useEffect(() => {
    const offP = db.subscribeProducts(setProducts);
    return () => {
      offP();
    };
  }, []);

  const list = useMemo(() => products ?? [], [products]);

  const filteredList = useMemo(() => {
    if (selectedCategory === "all") return list;
    return list.filter((p) => p.category === selectedCategory);
  }, [list, selectedCategory]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(list.map((p) => p.category));
    return Array.from(cats).sort();
  }, [list]);

  return (
    <div>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00f3ff]/25 bg-[#00f3ff]/10 px-3 py-1 text-xs font-semibold text-[#bffcff]">
              <Zap className="h-4 w-4" />
              Realtime inventory • Instant delivery
            </div>
            <h1 className="mt-4 text-balance text-3xl font-semibold md:text-5xl">
              steezkng <span className="text-[#00f3ff]">Marketplace</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
              Premium digital assets, accounts, and licenses. Pay with PayPal or CashApp.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-slate-300">
            Tip: Stock updates in <span className="text-[#00f3ff]">/admin-portal</span> reflect instantly here.
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">Products</h2>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === "all"
                    ? "bg-[#00f3ff] text-black"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                All
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? "bg-[#00f3ff] text-black"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {products === null ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-slate-300">
            Loading inventory…
          </div>
        ) : filteredList.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-slate-300">
            {selectedCategory === "all" ? (
              <>No products yet. Add items in <span className="text-[#00f3ff]">/admin-portal</span>.</>
            ) : (
              <>No products in "{selectedCategory}". <button onClick={() => setSelectedCategory("all")} className="text-[#00f3ff] hover:underline">Show all</button></>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredList.map((p) => (
              <ProductCard key={p.id} p={p} onFreeClaim={setFreeClaimProduct} />
            ))}
          </div>
        )}
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Free Claim Modal */}
      {freeClaimProduct && (
        <FreeClaimModal
          product={freeClaimProduct}
          onClose={() => setFreeClaimProduct(null)}
          onSuccess={(orderId) => {
            setFreeClaimProduct(null);
            nav(`/success?orderId=${orderId}`);
          }}
        />
      )}
    </div>
  );
}

function ProductCard({ p, onFreeClaim }: { p: Product; onFreeClaim: (p: Product) => void }) {
  const inStock = p.stockCount > 0;
  const isFree = p.price === 0;
  const [added, setAdded] = useState(false);

  function handleAction() {
    if (isFree) {
      onFreeClaim(p);
    } else {
      cartStore.add(p.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:border-[#00f3ff]/25">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -top-16 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-[#00f3ff]/10 blur-3xl" />
      </div>

      <div className="relative">
        {/* Product Image */}
        {p.imageUrl && (
          <div className="mb-4 -mx-5 -mt-5">
            <div className="aspect-video w-full overflow-hidden rounded-t-3xl border-b border-white/10 bg-black/50">
              <img
                src={p.imageUrl}
                alt={p.title}
                className="h-full w-full object-cover transition group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-100">{p.title}</div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-slate-300">
              <Tag className="h-3.5 w-3.5 text-[#00f3ff]" />
              <span className="font-semibold text-slate-200">{p.category}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">Product Type</span>
            </div>
          </div>

          <div className={`shrink-0 rounded-2xl border px-3 py-2 text-sm font-semibold ${
            isFree 
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" 
              : "border-[#00f3ff]/25 bg-[#00f3ff]/10 text-[#bffcff]"
          }`}>
            {isFree ? "FREE" : money(p.price)}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {inStock ? (
              <>
                <PackageCheck className="h-4 w-4 text-emerald-300" />
                <span className="text-slate-200">In stock</span>
              </>
            ) : (
              <>
                <PackageX className="h-4 w-4 text-rose-300" />
                <span className="text-slate-300">Sold out</span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-400">{p.stockCount} left</div>
        </div>

        <button
          type="button"
          disabled={!inStock}
          onClick={handleAction}
          className={
            "mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition " +
            (inStock
              ? isFree
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : added
                  ? "bg-emerald-500 text-white"
                  : "bg-[#00f3ff] text-black hover:brightness-110"
              : "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500")
          }
        >
          {!inStock 
            ? "Out of stock" 
            : isFree 
              ? "View Details" 
              : added 
                ? "Added to cart ✓" 
                : "Add to cart"}
        </button>

        <div className="mt-3 text-xs text-slate-500">
          Instant delivery: your purchase details will show on the success page.
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Free Claim Modal ─────────────── */

function FreeClaimModal({ product, onClose, onSuccess }: { product: Product; onClose: () => void; onSuccess: (orderId: string) => void }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create free order
      const order = await db.createOrder(
        email.trim(),
        [{ product, qty: 1 }],
        "paypal" // Default to paypal for free orders, logic handles it as paid
      );
      onSuccess(order.id);
    } catch (err) {
      console.error(err);
      setError("Failed to process request. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Claim Free Product</h2>
            <p className="mt-1 text-sm text-slate-400">{product.title}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Email Address</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 focus-within:border-[#00f3ff]/50">
              <Mail className="h-5 w-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
                autoFocus
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              We'll send the details to this email address.
            </p>
          </label>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Get Now"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── FAQ Section ─────────────── */

const faqData = [
  {
    question: "How does instant delivery work?",
    answer:
      "Once your payment is confirmed, you'll be instantly redirected to a success page where your purchased digital asset details (credentials, license keys, download links, etc.) will be displayed. No waiting, no manual processing—everything is automated for immediate access.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept PayPal (including debit/credit cards through PayPal guest checkout) and CashApp. For PayPal, you don't need an account—simply choose the 'Pay with Debit or Credit Card' option at checkout. For CashApp, scan the QR code or use our direct payment link.",
  },
  {
    question: "Are all sales final?",
    answer:
      "Yes, all digital sales are final. Due to the instant-delivery nature of digital products, we cannot offer refunds once the product details have been delivered. Please ensure you understand what you're purchasing before completing checkout.",
  },
  {
    question: "Is it safe to buy here?",
    answer:
      "Absolutely. We use secure payment processing through PayPal and CashApp—we never see or store your payment details. All transactions are encrypted, and we maintain a dispute evidence log to protect both buyers and sellers.",
  },
  {
    question: "What if I have issues with my purchase?",
    answer:
      "If you encounter any issues with your purchase, please contact us immediately with your Transaction ID and order details. We keep detailed records of all transactions and will work with you to resolve any legitimate concerns as quickly as possible.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Due to the digital nature of our products and instant delivery system, we do not offer refunds. Once product details are revealed, the sale is complete. However, if there's a genuine issue with your purchase (e.g., invalid credentials), contact us and we'll make it right.",
  },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur md:p-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00f3ff]/25 bg-[#00f3ff]/10">
          <HelpCircle className="h-7 w-7 text-[#00f3ff]" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-100 md:text-3xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-2 text-sm text-slate-400 md:text-base">
          Everything you need to know about buying from us
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-3">
        {faqData.map((faq, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 transition-all hover:border-[#00f3ff]/20"
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/5"
            >
              <span className="text-sm font-semibold text-slate-100 md:text-base">
                {faq.question}
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-[#00f3ff] transition-transform duration-300 ${
                  openIndex === index ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-slate-300">
                  {faq.answer}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-slate-500">
          Still have questions?{" "}
          <span className="text-[#00f3ff]">Contact us</span> and we'll get back to you.
        </p>
      </div>
    </section>
  );
}