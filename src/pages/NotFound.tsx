import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur">
      <div className="text-sm font-semibold text-slate-200">404</div>
      <div className="mt-2 text-2xl font-semibold">Page not found</div>
      <p className="mt-3 text-sm text-slate-400">The page you’re looking for doesn’t exist.</p>
      <Link
        className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#00f3ff] px-4 py-3 text-sm font-semibold text-black"
        to="/"
      >
        Back to marketplace
      </Link>
    </div>
  );
}