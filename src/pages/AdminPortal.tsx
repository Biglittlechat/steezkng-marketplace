import { useEffect, useMemo, useState } from "react";
import { PlusCircle, Shield, LogOut, Trash2, FolderPlus, Tag, Key, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { db, type Product, type Sale, type Category, type DeliveryKey } from "../lib/db";

const ADMIN_PASSWORD = "steezykngdabest";
const SESSION_KEY = "steezkng_admin_session";

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

function cls(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export function AdminPortalPage() {
  const [authed, setAuthed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SESSION_KEY) === "1";
  });

  if (!authed) {
    return <AdminLogin onAuthed={() => setAuthed(true)} />;
  }

  return <AdminDashboard onLogout={() => setAuthed(false)} />;
}

function AdminLogin({ onAuthed }: { onAuthed: () => void }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Shield className="h-5 w-5 text-[#00f3ff]" /> Secure Admin Command Center
      </div>
      <h1 className="mt-3 text-2xl font-semibold">/admin-portal</h1>
      <p className="mt-2 text-sm text-slate-400">Password gate required to access inventory & dispute evidence logs.</p>

      <div className="mt-6 grid gap-3">
        <label className="grid gap-2">
          <span className="text-xs font-semibold text-slate-300">Admin password</span>
          <div className="flex items-center gap-2">
            <input
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setErr(null);
              }}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100"
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-slate-200 transition hover:bg-white/10"
              aria-label={show ? "Hide" : "Show"}
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {err ? <div className="text-xs font-semibold text-rose-300">{err}</div> : null}

        <button
          type="button"
          onClick={() => {
            if (pw === ADMIN_PASSWORD) {
              sessionStorage.setItem(SESSION_KEY, "1");
              onAuthed();
              return;
            }
            setErr("Invalid password.");
          }}
          className="w-full rounded-2xl bg-[#00f3ff] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Enter
        </button>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Note: This is a frontend gate for demo purposes. In production, enforce auth server-side as well.
      </p>
    </div>
  );
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const offP = db.subscribeProducts((p) => setProducts(p ?? []));
    const offS = db.subscribeSales((s) => setSales(s ?? []));
    const offC = db.subscribeCategories((c) => setCategories(c ?? []));
    return () => {
      offP();
      offS();
      offC();
    };
  }, []);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("9.99");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Category management
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const totalStock = useMemo(() => products.reduce((sum, p) => sum + p.stockCount, 0), [products]);
  const totalKeys = useMemo(() => products.reduce((sum, p) => sum + p.deliveryKeys.length, 0), [products]);

  async function addProduct() {
    setSaving(true);
    try {
      await db.addProduct({
        title: title.trim() || "Untitled Product",
        price: Number(price) || 0,
        category: category.trim() || "Other",
        imageUrl: imageUrl.trim() || undefined,
      });
      setTitle("");
      setPrice("9.99");
      setCategory("");
      setImageUrl("");
    } finally {
      setSaving(false);
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      await db.addCategory(newCategoryName.trim());
      setNewCategoryName("");
    } finally {
      setAddingCategory(false);
    }
  }

  async function deleteCategory(catId: string) {
    if (!confirm("Delete this category? Products using it will keep their category name.")) return;
    await db.deleteCategory(catId);
  }

  async function deleteProduct(productId: string) {
    if (!confirm("Delete this product and all its keys?")) return;
    await db.deleteProduct(productId);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-200">Admin Command Center</div>
            <h1 className="mt-1 text-2xl font-semibold">Inventory Management</h1>
            <p className="mt-2 text-sm text-slate-400">Changes reflect instantly on the public marketplace.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(SESSION_KEY);
              onLogout();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-2xl font-bold text-[#00f3ff]">{products.length}</div>
            <div className="text-xs text-slate-400">Products</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-2xl font-bold text-green-400">{totalStock}</div>
            <div className="text-xs text-slate-400">Available Stock</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-2xl font-bold text-purple-400">{totalKeys}</div>
            <div className="text-xs text-slate-400">Total Keys</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-2xl font-bold text-orange-400">{sales.length}</div>
            <div className="text-xs text-slate-400">Total Sales</div>
          </div>
        </div>

        {/* Category Manager */}
        <div className="mt-6 rounded-3xl border border-[#00f3ff]/20 bg-[#00f3ff]/5 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#bffcff]">
            <FolderPlus className="h-4 w-4" /> Category Manager
          </div>
          <p className="mt-1 text-xs text-slate-400">Add or remove product categories.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
              >
                <Tag className="h-3.5 w-3.5 text-[#00f3ff]" />
                <span className="text-slate-200">{cat.name}</span>
                <button
                  type="button"
                  onClick={() => void deleteCategory(cat.id)}
                  className="ml-1 rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-rose-300"
                  aria-label={`Delete ${cat.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-xs text-slate-500">No categories yet. Add one below.</div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name"
              className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-100"
              onKeyDown={(e) => {
                if (e.key === "Enter") void addCategory();
              }}
            />
            <button
              type="button"
              disabled={addingCategory || !newCategoryName.trim()}
              onClick={() => void addCategory()}
              className={cls(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                addingCategory || !newCategoryName.trim()
                  ? "border border-white/10 bg-white/5 text-slate-500"
                  : "bg-[#00f3ff] text-black hover:brightness-110"
              )}
            >
              <PlusCircle className="h-4 w-4" /> Add
            </button>
          </div>
        </div>

        {/* Add Product */}
        <div className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-200">Add New Product</div>
            <div className="text-xs text-slate-500">
              <Key className="mr-1 inline h-3 w-3" />
              Add keys after creating the product
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-slate-300">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-100"
                placeholder="Product title"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-slate-300">Price (USD)</span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-100"
                placeholder="9.99"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-slate-300">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-100"
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-slate-300">Image URL</span>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-100"
                placeholder="https://example.com/image.jpg"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={saving || !title.trim()}
            onClick={() => void addProduct()}
            className={cls(
              "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
              saving || !title.trim()
                ? "border border-white/10 bg-white/5 text-slate-500"
                : "bg-[#00f3ff] text-black hover:brightness-110"
            )}
          >
            <PlusCircle className="h-4 w-4" /> {saving ? "Creating…" : "Create Product"}
          </button>
        </div>
      </section>

      {/* Product Inventory with Key Management */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-200">Product Inventory & Key Management</div>
            <div className="mt-1 text-xs text-slate-500">
              <Key className="mr-1 inline h-3 w-3" />
              Add unique keys/credentials for each product. Each key is used only once.
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          {products.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-slate-400">
              No products yet. Create one above.
            </div>
          ) : (
            products.map((p) => (
              <ProductKeyManager key={p.id} product={p} onDelete={() => void deleteProduct(p.id)} />
            ))
          )}
        </div>
      </section>

      {/* Dispute Evidence Log */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div>
          <div className="text-sm font-semibold text-slate-200">Dispute Evidence Log</div>
          <div className="mt-1 text-xs text-slate-500">
            Every sale: Buyer's Email • Timestamp • Transaction ID • Buyer's IP • Payment Method
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/30">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-semibold text-slate-400">
                <th className="px-4 py-3">Buyer Email</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Buyer IP</th>
                <th className="px-4 py-3">Method</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    No sales yet.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 text-xs text-slate-200">
                    <td className="truncate px-4 py-3">{s.buyerEmail}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(s.timestamp).toLocaleString()}</td>
                    <td className="truncate px-4 py-3 font-mono font-semibold text-slate-100">{s.transactionId}</td>
                    <td className="px-4 py-3 text-slate-300">{s.buyerIp}</td>
                    <td className={s.paymentMethod === "cashapp" ? "px-4 py-3 text-green-400" : "px-4 py-3 text-blue-400"}>
                      {s.paymentMethod === "cashapp" ? "CashApp" : "PayPal"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Sales are recorded when the backend verifies payment and marks the order as paid.
        </p>
      </section>
    </div>
  );
}

function ProductKeyManager({ product, onDelete }: { product: Product; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [newKeys, setNewKeys] = useState("");
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState(product.imageUrl || "");
  const [savingImage, setSavingImage] = useState(false);

  const availableKeys = product.deliveryKeys.filter((k) => !k.used);
  const usedKeys = product.deliveryKeys.filter((k) => k.used);

  async function handleAddKeys() {
    if (!newKeys.trim()) return;
    setAdding(true);
    try {
      // Split by newlines, filter empty
      const keys = newKeys
        .split("\n")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      if (keys.length > 0) {
        await db.addKeysToProduct(product.id, keys);
        setNewKeys("");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveKey(keyId: string) {
    await db.removeKeyFromProduct(product.id, keyId);
  }

  async function handleSaveImage() {
    setSavingImage(true);
    try {
      await db.updateProduct(product.id, {
        imageUrl: newImageUrl.trim() || undefined,
      });
      setEditingImage(false);
    } finally {
      setSavingImage(false);
    }
  }

  function copyKey(key: DeliveryKey) {
    navigator.clipboard.writeText(key.key);
    setCopiedId(key.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4 hover:bg-white/5 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Product Image Thumbnail */}
          {product.imageUrl && (
            <div className="h-12 w-12 flex-shrink-0 rounded-xl border border-white/10 bg-black/50 overflow-hidden">
              <img
                src={product.imageUrl}
                alt={product.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-slate-100">{product.title}</div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="rounded bg-white/10 px-2 py-0.5">{product.category}</span>
              <span className="font-semibold text-[#00f3ff]">{money(product.price)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className={cls(
                "rounded-full px-2 py-1 text-xs font-semibold",
                availableKeys.length > 0 ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
              )}>
                {availableKeys.length} available
              </span>
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-400">
                {usedKeys.length} used
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-white/10 px-4 py-4">
          {/* Image Edit Section */}
          <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">Product Image</div>
              {!editingImage && (
                <button
                  type="button"
                  onClick={() => setEditingImage(true)}
                  className="rounded-lg px-3 py-1 text-xs font-semibold text-[#00f3ff] hover:bg-white/5"
                >
                  Edit
                </button>
              )}
            </div>
            
            {editingImage ? (
              <div className="mt-3 grid gap-3">
                <input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-slate-100"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={savingImage}
                    onClick={() => void handleSaveImage()}
                    className={cls(
                      "rounded-xl px-4 py-2 text-sm font-semibold transition",
                      savingImage
                        ? "border border-white/10 bg-white/5 text-slate-500"
                        : "bg-[#00f3ff] text-black hover:brightness-110"
                    )}
                  >
                    {savingImage ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingImage(false);
                      setNewImageUrl(product.imageUrl || "");
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                {product.imageUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="h-20 w-20 rounded-xl border border-white/10 bg-black/50 overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="text-xs text-slate-400 truncate flex-1">{product.imageUrl}</div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No image set</div>
                )}
              </div>
            )}
          </div>

          {/* Add Keys Section */}
          <div className="mb-4 rounded-2xl border border-[#00f3ff]/20 bg-[#00f3ff]/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#bffcff]">
              <Key className="h-4 w-4" /> Add Keys / Credentials / Passwords
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Enter one key per line. Each key will be delivered to exactly ONE buyer.
            </p>
            <textarea
              value={newKeys}
              onChange={(e) => setNewKeys(e.target.value)}
              placeholder={`user1@email.com:password123\nuser2@email.com:password456\nLICENSE-KEY-ABC-123\nLICENSE-KEY-DEF-456`}
              className="mt-3 min-h-32 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-slate-100"
            />
            <button
              type="button"
              disabled={adding || !newKeys.trim()}
              onClick={() => void handleAddKeys()}
              className={cls(
                "mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                adding || !newKeys.trim()
                  ? "border border-white/10 bg-white/5 text-slate-500"
                  : "bg-[#00f3ff] text-black hover:brightness-110"
              )}
            >
              <PlusCircle className="h-4 w-4" />
              {adding ? "Adding..." : `Add Keys (${newKeys.split("\n").filter((k) => k.trim()).length} detected)`}
            </button>
          </div>

          {/* Available Keys */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-300">
              <Key className="h-4 w-4" /> Available Keys ({availableKeys.length})
            </div>
            {availableKeys.length === 0 ? (
              <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-slate-500">
                No keys available. Add some above.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/20">
                {availableKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2 last:border-b-0"
                  >
                    <code className="flex-1 truncate font-mono text-xs text-slate-200">{key.key}</code>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => copyKey(key)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
                        title="Copy"
                      >
                        {copiedId === key.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemoveKey(key.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Used Keys */}
          {usedKeys.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-400">
                <Key className="h-4 w-4" /> Used Keys ({usedKeys.length})
              </div>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-white/10 bg-black/20">
                {usedKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2 last:border-b-0"
                  >
                    <code className="flex-1 truncate font-mono text-xs text-slate-500 line-through">{key.key}</code>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Order: {key.claimedBy?.slice(0, 8)}...</span>
                      {key.claimedAt && (
                        <span>{new Date(key.claimedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}