import { nanoid } from "nanoid";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NJ_TAX_RATE } from "./tax";

export type DeliveryKey = {
  id: string;
  key: string;
  used: boolean;
  claimedBy?: string; // orderId
  claimedAt?: number;
};

export type Product = {
  id: string;
  title: string;
  price: number;
  category: string;
  imageUrl?: string;
  stockCount: number; // computed from available keys
  deliveryKeys: DeliveryKey[];
  createdAt: number;
};

export type Category = {
  id: string;
  name: string;
  createdAt: number;
};

export type CartLine = { productId: string; qty: number };

export type OrderItem = {
  productId: string;
  title: string;
  qty: number;
  unitPrice: number;
  claimedKeyIds: string[]; // IDs of keys claimed for this item
};

export type Order = {
  id: string;
  buyerEmail: string;
  items: OrderItem[];
  status: "pending" | "paid" | "failed";
  paymentMethod: "paypal" | "cashapp";
  createdAt: number;
  transactionId?: string;
  buyerIp?: string;
};

export type Sale = {
  id: string;
  orderId: string;
  buyerEmail: string;
  timestamp: number;
  transactionId: string;
  buyerIp: string;
  paymentMethod: "paypal" | "cashapp";
};

const LS_PRODUCTS = "steezkng_products_v2";
const LS_ORDERS = "steezkng_orders_v2";
const LS_SALES = "steezkng_sales_v2";
const LS_CATEGORIES = "steezkng_categories_v1";
const BC_NAME = "steezkng_realtime";

type BroadcastMsg =
  | { kind: "products" }
  | { kind: "orders"; orderId?: string }
  | { kind: "sales" }
  | { kind: "categories" };

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function canUseBrowserStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function getBC(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BCAny: any = (window as any).BroadcastChannel;
  if (!BCAny) return null;
  return new BCAny(BC_NAME) as BroadcastChannel;
}

function readProductsLocal(): Product[] {
  if (!canUseBrowserStorage()) return [];
  return safeParse<Product[]>(localStorage.getItem(LS_PRODUCTS), []);
}

function writeProductsLocal(products: Product[]) {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(LS_PRODUCTS, JSON.stringify(products));
}

function readOrdersLocal(): Order[] {
  if (!canUseBrowserStorage()) return [];
  return safeParse<Order[]>(localStorage.getItem(LS_ORDERS), []);
}

function writeOrdersLocal(orders: Order[]) {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
}

function readSalesLocal(): Sale[] {
  if (!canUseBrowserStorage()) return [];
  return safeParse<Sale[]>(localStorage.getItem(LS_SALES), []);
}

function writeSalesLocal(sales: Sale[]) {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(LS_SALES, JSON.stringify(sales));
}

function readCategoriesLocal(): Category[] {
  if (!canUseBrowserStorage()) return [];
  return safeParse<Category[]>(localStorage.getItem(LS_CATEGORIES), []);
}

function writeCategoriesLocal(categories: Category[]) {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(LS_CATEGORIES, JSON.stringify(categories));
}

function seedIfEmpty() {
  if (!canUseBrowserStorage()) return;
  
  // Seed categories
  const existingCats = readCategoriesLocal();
  if (existingCats.length === 0) {
    const defaultCats: Category[] = [
      { id: nanoid(), name: "License", createdAt: Date.now() },
      { id: nanoid(), name: "Account", createdAt: Date.now() + 1 },
      { id: nanoid(), name: "Digital Asset", createdAt: Date.now() + 2 },
      { id: nanoid(), name: "Service", createdAt: Date.now() + 3 },
      { id: nanoid(), name: "Gift", createdAt: Date.now() + 4 },
    ];
    writeCategoriesLocal(defaultCats);
  }

  const existing = readProductsLocal();
  if (existing.length > 0) return;

  const now = Date.now();
  
  // Helper to create sample keys
  const createSampleKeys = (count: number, prefix: string): DeliveryKey[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: nanoid(),
      key: `${prefix}-KEY-${String(i + 1).padStart(3, '0')}-${nanoid(8).toUpperCase()}`,
      used: false,
    }));
  };

  const seed: Product[] = [
    {
      id: nanoid(),
      title: "Windows 11 Pro License (Digital)",
      price: 19.99,
      category: "License",
      stockCount: 8,
      deliveryKeys: createSampleKeys(8, "WIN11PRO"),
      createdAt: now,
    },
    {
      id: nanoid(),
      title: "Adobe CC (1 Month) — Account Access",
      price: 14.5,
      category: "Account",
      stockCount: 5,
      deliveryKeys: createSampleKeys(5, "ADOBE"),
      createdAt: now + 1,
    },
    {
      id: nanoid(),
      title: "Game Server Starter Pack (Configs)",
      price: 9.0,
      category: "Digital Asset",
      stockCount: 12,
      deliveryKeys: createSampleKeys(12, "GAMESERV"),
      createdAt: now + 2,
    },
    {
      id: nanoid(),
      title: "Stream Overlay Pack (Neon)",
      price: 7.5,
      category: "Digital Asset",
      stockCount: 20,
      deliveryKeys: createSampleKeys(20, "OVERLAY"),
      createdAt: now + 3,
    },
    {
      id: nanoid(),
      title: "Premium VPN (30 Days) — Config",
      price: 11.99,
      category: "Service",
      stockCount: 6,
      deliveryKeys: createSampleKeys(6, "VPN"),
      createdAt: now + 4,
    },
    {
      id: nanoid(),
      title: "Discord Nitro (1 Month) — Gift",
      price: 8.99,
      category: "Gift",
      stockCount: 0,
      deliveryKeys: [],
      createdAt: now + 5,
    },
  ];

  writeProductsLocal(seed);
}

seedIfEmpty();

function emit(msg: BroadcastMsg) {
  const bc = getBC();
  bc?.postMessage(msg);
}

function onBroadcast(handler: (msg: BroadcastMsg) => void) {
  const bc = getBC();
  if (!bc) return () => {};
  const listener = (ev: MessageEvent) => handler(ev.data as BroadcastMsg);
  bc.addEventListener("message", listener);
  return () => bc.removeEventListener("message", listener);
}

function money(n: number) {
  return Number(n.toFixed(2));
}

function env(name: string) {
  return (import.meta as unknown as { env: Record<string, string | undefined> }).env[name];
}

function maybeSupabase(): SupabaseClient | null {
  const url = env("VITE_SUPABASE_URL");
  const key = env("VITE_SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  return createClient(url, key);
}

const supabase = maybeSupabase();

// Helper to compute available stock from keys
function computeStock(product: Product): number {
  return product.deliveryKeys.filter(k => !k.used).length;
}

export const db = {
  // Categories
  async listCategories(): Promise<Category[]> {
    if (supabase) {
      const { data, error } = await supabase.from("categories").select("*").order("createdAt", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    }
    return readCategoriesLocal().sort((a, b) => a.createdAt - b.createdAt);
  },

  subscribeCategories(cb: (categories: Category[]) => void) {
    let alive = true;
    const refresh = async () => {
      if (!alive) return;
      cb(await db.listCategories());
    };

    void refresh();

    const offLocal = onBroadcast((msg) => {
      if (msg?.kind === "categories") void refresh();
    });

    let offSupabase = () => {};
    if (supabase) {
      const channel = supabase
        .channel("categories_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "categories" },
          () => void refresh()
        )
        .subscribe();
      offSupabase = () => {
        void supabase.removeChannel(channel);
      };
    }

    return () => {
      alive = false;
      offLocal();
      offSupabase();
    };
  },

  async addCategory(name: string): Promise<Category> {
    const category: Category = {
      id: nanoid(),
      name: name.trim(),
      createdAt: Date.now(),
    };

    if (supabase) {
      const { data, error } = await supabase.from("categories").insert(category).select("*").single();
      if (error) throw error;
      return data as Category;
    }

    const categories = readCategoriesLocal();
    categories.push(category);
    writeCategoriesLocal(categories);
    emit({ kind: "categories" });
    return category;
  },

  async deleteCategory(categoryId: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId);
      if (error) throw error;
      return;
    }

    const categories = readCategoriesLocal().filter((c) => c.id !== categoryId);
    writeCategoriesLocal(categories);
    emit({ kind: "categories" });
  },

  // Products
  async listProducts(): Promise<Product[]> {
    if (supabase) {
      const { data, error } = await supabase.from("products").select("*").order("createdAt", { ascending: false });
      if (error) throw error;
      // Ensure stockCount is computed from keys
      return ((data ?? []) as Product[]).map(p => ({
        ...p,
        stockCount: computeStock(p)
      }));
    }
    const products = readProductsLocal();
    return products
      .map(p => ({ ...p, stockCount: computeStock(p) }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async getProduct(productId: string): Promise<Product | null> {
    const products = await db.listProducts();
    return products.find(p => p.id === productId) ?? null;
  },

  subscribeProducts(cb: (products: Product[]) => void) {
    let alive = true;
    const refresh = async () => {
      if (!alive) return;
      cb(await db.listProducts());
    };

    void refresh();

    const offLocal = onBroadcast((msg) => {
      if (msg?.kind === "products") void refresh();
    });

    let offSupabase = () => {};
    if (supabase) {
      const channel = supabase
        .channel("products_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          () => void refresh()
        )
        .subscribe();
      offSupabase = () => {
        void supabase.removeChannel(channel);
      };
    }

    return () => {
      alive = false;
      offLocal();
      offSupabase();
    };
  },

  async addProduct(input: {
    title: string;
    price: number;
    category: string;
    imageUrl?: string;
  }): Promise<Product> {
    const product: Product = {
      id: nanoid(),
      title: input.title,
      price: money(input.price),
      category: input.category,
      imageUrl: input.imageUrl,
      stockCount: 0,
      deliveryKeys: [],
      createdAt: Date.now(),
    };

    if (supabase) {
      const { data, error } = await supabase.from("products").insert(product).select("*").single();
      if (error) throw error;
      return data as Product;
    }

    const products = readProductsLocal();
    products.push(product);
    writeProductsLocal(products);
    emit({ kind: "products" });
    return product;
  },

  async updateProduct(productId: string, updates: Partial<Pick<Product, 'title' | 'price' | 'category' | 'imageUrl'>>): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from("products").update(updates).eq("id", productId);
      if (error) throw error;
      return;
    }

    const products = readProductsLocal();
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) return;
    
    products[idx] = { ...products[idx], ...updates };
    writeProductsLocal(products);
    emit({ kind: "products" });
  },

  // Key Management
  async addKeysToProduct(productId: string, keys: string[]): Promise<void> {
    const products = readProductsLocal();
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) throw new Error("Product not found");

    const newKeys: DeliveryKey[] = keys.map(key => ({
      id: nanoid(),
      key: key.trim(),
      used: false,
    }));

    products[idx].deliveryKeys.push(...newKeys);
    products[idx].stockCount = computeStock(products[idx]);

    if (supabase) {
      const { error } = await supabase.from("products").update({
        deliveryKeys: products[idx].deliveryKeys,
        stockCount: products[idx].stockCount
      }).eq("id", productId);
      if (error) throw error;
      return;
    }

    writeProductsLocal(products);
    emit({ kind: "products" });
  },

  async removeKeyFromProduct(productId: string, keyId: string): Promise<void> {
    const products = readProductsLocal();
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) return;

    products[idx].deliveryKeys = products[idx].deliveryKeys.filter(k => k.id !== keyId);
    products[idx].stockCount = computeStock(products[idx]);

    if (supabase) {
      const { error } = await supabase.from("products").update({
        deliveryKeys: products[idx].deliveryKeys,
        stockCount: products[idx].stockCount
      }).eq("id", productId);
      if (error) throw error;
      return;
    }

    writeProductsLocal(products);
    emit({ kind: "products" });
  },

  async getAvailableKeys(productId: string, count: number): Promise<DeliveryKey[]> {
    const product = await db.getProduct(productId);
    if (!product) return [];
    return product.deliveryKeys.filter(k => !k.used).slice(0, count);
  },

  async claimKeys(productId: string, keyIds: string[], orderId: string): Promise<void> {
    const products = readProductsLocal();
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) return;

    for (const keyId of keyIds) {
      const keyIdx = products[idx].deliveryKeys.findIndex(k => k.id === keyId);
      if (keyIdx !== -1) {
        products[idx].deliveryKeys[keyIdx].used = true;
        products[idx].deliveryKeys[keyIdx].claimedBy = orderId;
        products[idx].deliveryKeys[keyIdx].claimedAt = Date.now();
      }
    }
    products[idx].stockCount = computeStock(products[idx]);

    if (supabase) {
      const { error } = await supabase.from("products").update({
        deliveryKeys: products[idx].deliveryKeys,
        stockCount: products[idx].stockCount
      }).eq("id", productId);
      if (error) throw error;
      return;
    }

    writeProductsLocal(products);
    emit({ kind: "products" });
  },

  async getClaimedKeysForOrder(orderId: string): Promise<Array<{ productId: string; productTitle: string; keys: string[] }>> {
    const products = await db.listProducts();
    const result: Array<{ productId: string; productTitle: string; keys: string[] }> = [];

    for (const product of products) {
      const claimedKeys = product.deliveryKeys
        .filter(k => k.claimedBy === orderId)
        .map(k => k.key);
      
      if (claimedKeys.length > 0) {
        result.push({
          productId: product.id,
          productTitle: product.title,
          keys: claimedKeys
        });
      }
    }

    return result;
  },

  async deleteProduct(productId: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
      return;
    }
    const products = readProductsLocal().filter((p) => p.id !== productId);
    writeProductsLocal(products);
    emit({ kind: "products" });
  },

  // Orders
  async createOrder(
    buyerEmail: string,
    lines: Array<{ product: Product; qty: number }>,
    paymentMethod: "paypal" | "cashapp" = "paypal"
  ): Promise<Order> {
    // Reserve keys for each item
    const items: OrderItem[] = [];
    
    for (const line of lines) {
      const availableKeys = await db.getAvailableKeys(line.product.id, line.qty);
      if (availableKeys.length < line.qty) {
        throw new Error(`Not enough stock for ${line.product.title}. Only ${availableKeys.length} available.`);
      }
      
      items.push({
        productId: line.product.id,
        title: line.product.title,
        qty: line.qty,
        unitPrice: money(line.product.price),
        claimedKeyIds: availableKeys.map(k => k.id),
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    const taxableSubtotal = items.reduce((sum, item) => {
      if (item.unitPrice <= 0) return sum;
      return sum + item.unitPrice * item.qty;
    }, 0);
    const tax = money(taxableSubtotal * NJ_TAX_RATE);
    const totalPrice = money(subtotal + tax);
    const isFree = totalPrice === 0;

    const order: Order = {
      id: nanoid(),
      buyerEmail,
      items,
      status: isFree ? "paid" : "pending",
      paymentMethod,
      createdAt: Date.now(),
      transactionId: isFree ? `FREE-${nanoid(8).toUpperCase()}` : undefined,
    };

    // If free, claim keys immediately
    if (isFree) {
      for (const item of items) {
        await db.claimKeys(item.productId, item.claimedKeyIds, order.id);
      }
    }

    if (supabase) {
      const { data, error } = await supabase.from("orders").insert(order).select("*").single();
      if (error) throw error;
      
      // If free, also record sale immediately
      if (isFree) {
        const sale: Sale = {
          id: nanoid(),
          orderId: order.id,
          buyerEmail: order.buyerEmail,
          timestamp: Date.now(),
          transactionId: order.transactionId!,
          buyerIp: "127.0.0.1", // Placeholder, would need server-side for real IP
          paymentMethod: "paypal", // Default to paypal or custom "free" type
        };
        await supabase.from("sales").insert(sale);
      }
      
      return data as Order;
    }

    const orders = readOrdersLocal();
    orders.push(order);
    writeOrdersLocal(orders);
    emit({ kind: "orders", orderId: order.id });

    // If free, record sale locally
    if (isFree) {
      const sales = readSalesLocal();
      sales.unshift({
        id: nanoid(),
        orderId: order.id,
        buyerEmail: order.buyerEmail,
        timestamp: Date.now(),
        transactionId: order.transactionId!,
        buyerIp: "127.0.0.1",
        paymentMethod: "paypal",
      });
      writeSalesLocal(sales);
      emit({ kind: "sales" });
    }

    return order;
  },

  async getOrder(orderId: string): Promise<Order | null> {
    if (supabase) {
      const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).single();
      if (error) return null;
      return (data ?? null) as Order | null;
    }

    const orders = readOrdersLocal();
    return orders.find((o) => o.id === orderId) ?? null;
  },

  subscribeOrder(orderId: string, cb: (order: Order | null) => void) {
    let alive = true;
    const refresh = async () => {
      if (!alive) return;
      cb(await db.getOrder(orderId));
    };

    void refresh();

    const offLocal = onBroadcast((msg) => {
      if (msg?.kind === "orders" && (!msg.orderId || msg.orderId === orderId)) void refresh();
    });

    let offSupabase = () => {};
    if (supabase) {
      const channel = supabase
        .channel(`order_${orderId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
          () => void refresh()
        )
        .subscribe();
      offSupabase = () => {
        void supabase.removeChannel(channel);
      };
    }

    return () => {
      alive = false;
      offLocal();
      offSupabase();
    };
  },

  async markOrderPaid(
    orderId: string,
    info: { transactionId: string; buyerEmail: string; buyerIp: string; paymentMethod?: "paypal" | "cashapp" }
  ) {
    const order = await db.getOrder(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status === "paid") return;

    // Claim the reserved keys
    for (const item of order.items) {
      await db.claimKeys(item.productId, item.claimedKeyIds, orderId);
    }

    const paidOrder: Order = {
      ...order,
      status: "paid",
      transactionId: info.transactionId,
      buyerEmail: info.buyerEmail,
      buyerIp: info.buyerIp,
    };

    const salePaymentMethod = info.paymentMethod ?? order.paymentMethod ?? "paypal";

    if (supabase) {
      const { error } = await supabase.from("orders").update(paidOrder).eq("id", orderId);
      if (error) throw error;

      const sale: Sale = {
        id: nanoid(),
        orderId,
        buyerEmail: paidOrder.buyerEmail,
        timestamp: Date.now(),
        transactionId: info.transactionId,
        buyerIp: info.buyerIp,
        paymentMethod: salePaymentMethod,
      };
      const { error: saleErr } = await supabase.from("sales").insert(sale);
      if (saleErr) throw saleErr;

      return;
    }

    const orders = readOrdersLocal();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx >= 0) orders[idx] = paidOrder;
    writeOrdersLocal(orders);

    const sales = readSalesLocal();
    sales.unshift({
      id: nanoid(),
      orderId,
      buyerEmail: paidOrder.buyerEmail,
      timestamp: Date.now(),
      transactionId: info.transactionId,
      buyerIp: info.buyerIp,
      paymentMethod: salePaymentMethod,
    });
    writeSalesLocal(sales);

    emit({ kind: "orders", orderId });
    emit({ kind: "sales" });
  },

  // Sales evidence
  async listSales(): Promise<Sale[]> {
    if (supabase) {
      const { data, error } = await supabase.from("sales").select("*").order("timestamp", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Sale[];
    }

    return readSalesLocal();
  },

  subscribeSales(cb: (sales: Sale[]) => void) {
    let alive = true;
    const refresh = async () => {
      if (!alive) return;
      cb(await db.listSales());
    };

    void refresh();

    const offLocal = onBroadcast((msg) => {
      if (msg?.kind === "sales") void refresh();
    });

    let offSupabase = () => {};
    if (supabase) {
      const channel = supabase
        .channel("sales_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sales" },
          () => void refresh()
        )
        .subscribe();
      offSupabase = () => {
        void supabase.removeChannel(channel);
      };
    }

    return () => {
      alive = false;
      offLocal();
      offSupabase();
    };
  },
};