import { Link } from "react-router-dom";

export function SuccessPage() {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
      <h1 className="text-2xl font-semibold text-slate-100">Payment Received</h1>
      <p className="mt-2 text-sm text-slate-400">
        If your payment completed, your order will be processed and keys will appear here (or in your email)
        once verified.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-2xl bg-[#00f3ff] px-4 py-3 text-sm font-semibold text-black"
        >
          Back to shop
        </Link>
        <Link
          to="/cart"
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10"
        >
          View cart
        </Link>
      </div>
    </div>
  );
}