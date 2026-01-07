import { Outlet, NavLink, useLocation } from "react-router-dom";
import { ShoppingCart, Shield, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cartCount, cartStore, type CartItem } from "../lib/cart";

function cls(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export function Layout() {
  const location = useLocation();
  const [cart, setCart] = useState<CartItem[]>(() => cartStore.get());

  useEffect(() => cartStore.subscribe(() => setCart(cartStore.get())), []);

  const count = useMemo(() => cartCount(cart), [cart]);

  useEffect(() => {
    // close any hash/anchor weirdness on route change
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="min-h-screen text-slate-100">
      <Header cartCount={count} />
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Header({ cartCount }: { cartCount: number }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080808]/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_25px_rgba(0,243,255,0.18)]">
            <Sparkles className="h-5 w-5 text-[#00f3ff]" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">steezkng</div>
            <div className="text-xs text-slate-400">digital assets & licenses</div>
          </div>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          <Nav
            to="/"
            label="Marketplace"
          />
          <Nav
            to="/admin-portal"
            label="Admin"
            icon={<Shield className="h-4 w-4" />}
          />
        </nav>

        <div className="flex items-center gap-2">
          <NavLink
            to="/cart"
            className={({ isActive }) =>
              cls(
                "group inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                isActive
                  ? "border-[#00f3ff]/40 bg-[#00f3ff]/10 text-[#bffcff]"
                  : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
              )
            }
            aria-label="Cart"
          >
            <ShoppingCart className="h-4 w-4 text-slate-200 group-hover:text-white" />
            <span>Cart</span>
            <span className="ml-1 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-xs text-slate-200">
              {cartCount}
            </span>
          </NavLink>
        </div>
      </div>
    </header>
  );
}

function Nav({ to, label, icon }: { to: string; label: string; icon?: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cls(
          "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
          isActive ? "text-white" : "text-slate-300 hover:text-white"
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-sm font-semibold">steezkng</div>
            <p className="mt-2 text-sm text-slate-400">
              Professional-grade digital goods marketplace UI. Inventory and sales log update in real-time.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shop</div>
              <div className="mt-3 grid gap-2 text-slate-300">
                <NavLink className="hover:text-white" to="/">
                  Marketplace
                </NavLink>
                <NavLink className="hover:text-white" to="/cart">
                  Cart
                </NavLink>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin</div>
              <div className="mt-3 grid gap-2 text-slate-300">
                <NavLink className="hover:text-white" to="/admin-portal">
                  Command Center
                </NavLink>
              </div>
            </div>
          </div>
          <div className="md:text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Legal</div>
            <p className="mt-3 text-sm text-slate-400">
              Digital sales are final. Ensure you meet your local legal requirements.
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} steezkng</div>
          <div>Theme: charcoal #080808 • neon #00f3ff • glass UI</div>
        </div>
      </div>
    </footer>
  );
}