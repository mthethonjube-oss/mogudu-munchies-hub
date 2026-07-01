import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, MapPin } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { placeOrder } from "@/lib/orders.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — Mthetho's Cultural Food" }] }),
  component: CartPage,
});

const DEFAULT_LOC = { lat: -26.2041, lng: 28.0473 }; // Johannesburg

function CartPage() {
  const { items, setQty, remove, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const place = useServerFn(placeOrder);

  const delivery = items.length > 0 ? 35 : 0;
  const total = subtotal + delivery;

  const checkout = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/cart" } });
      return;
    }
    if (!address.trim()) {
      toast.error("Please enter a delivery address");
      return;
    }
    setBusy(true);
    try {
      const res = await place({
        data: {
          items: items.map((i) => ({ menu_item_id: i.menu_item_id, qty: i.qty, notes: i.notes })),
          address,
          lat: DEFAULT_LOC.lat,
          lng: DEFAULT_LOC.lng,
          notes,
        },
      });
      clear();
      toast.success("Order placed!");
      navigate({ to: "/orders/$orderId", params: { orderId: res.orderId } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not place order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl">Your cart</h1>
      <p className="mt-1 text-sm text-muted-foreground">{items.length} {items.length === 1 ? "item" : "items"}</p>

      {items.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-border bg-card/40 p-12 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link to="/menu" className="mt-4 inline-block rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-background">Browse menu</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_22rem]">
          <ul className="space-y-3">
            <AnimatePresence>
              {items.map((it) => (
                <motion.li
                  key={it.menu_item_id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3"
                >
                  <img src={it.image_url ?? ""} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-lg">{it.name}</div>
                    <div className="text-sm text-gold">{formatPrice(it.price)}</div>
                    {it.notes && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">Note: {it.notes}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background">
                    <button onClick={() => setQty(it.menu_item_id, it.qty - 1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button>
                    <div className="w-6 text-center text-sm">{it.qty}</div>
                    <button onClick={() => setQty(it.menu_item_id, it.qty + 1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button onClick={() => remove(it.menu_item_id)} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <aside className="space-y-4 rounded-3xl border border-gold/20 bg-card p-6 h-fit">
            <h2 className="font-display text-xl">Checkout</h2>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Delivery address</label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Vilakazi Street, Soweto"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:border-gold/50 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-gold/50 focus:outline-none" />
            </div>

            <dl className="space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{formatPrice(delivery)}</dd></div>
              <div className="flex justify-between border-t border-border pt-2 text-base"><dt>Total</dt><dd className="font-medium text-gold">{formatPrice(total)}</dd></div>
            </dl>
            <p className="text-xs text-muted-foreground">Pay on delivery (cash or card).</p>
            <button onClick={checkout} disabled={busy} className="w-full rounded-full bg-gold px-5 py-3 text-sm font-medium text-background glow-gold disabled:opacity-60">
              {busy ? "Placing order…" : user ? "Place order" : "Sign in to checkout"}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
