import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  menu_item_id: string;
  name: string;
  price: number;
  image_url: string | null;
  qty: number;
  notes?: string;
};

type CartCtx = {
  items: CartItem[];
  add: (it: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "mogudu-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const add: CartCtx["add"] = (it, qty = 1) =>
    setItems((prev) => {
      const i = prev.findIndex((p) => p.menu_item_id === it.menu_item_id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...prev, { ...it, qty }];
    });

  const remove: CartCtx["remove"] = (id) => setItems((p) => p.filter((x) => x.menu_item_id !== id));
  const setQty: CartCtx["setQty"] = (id, qty) =>
    setItems((p) => (qty <= 0 ? p.filter((x) => x.menu_item_id !== id) : p.map((x) => (x.menu_item_id === id ? { ...x, qty } : x))));
  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return <Ctx.Provider value={{ items, add, remove, setQty, clear, subtotal, count }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
