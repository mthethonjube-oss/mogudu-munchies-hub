import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/menu/$itemId")({
  component: ItemPage,
});

function ItemPage() {
  const { itemId } = Route.useParams();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const { add } = useCart();
  const navigate = useNavigate();

  const q = useQuery({
    queryKey: ["menu-item", itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("id,name,description,price,image_url,category_id")
        .eq("id", itemId)
        .maybeSingle();
      return data;
    },
  });

  if (q.isLoading) return <div className="mx-auto max-w-4xl px-4 py-20">Loading…</div>;
  if (!q.data) return <div className="mx-auto max-w-4xl px-4 py-20">Dish not found.</div>;
  const it = q.data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to="/menu" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold">
        <ArrowLeft className="h-4 w-4" /> Back to menu
      </Link>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="overflow-hidden rounded-3xl border border-gold/20 bg-card">
          <img src={it.image_url ?? ""} alt={it.name} className="aspect-square w-full object-cover" />
        </motion.div>
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">{it.name}</h1>
          <div className="mt-3 text-2xl font-medium text-gold">{formatPrice(it.price)}</div>
          <p className="mt-4 leading-relaxed text-muted-foreground">{it.description}</p>

          <div className="mt-8">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Quantity</label>
            <div className="mt-2 inline-flex items-center rounded-full border border-border bg-card">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted">
                <Minus className="h-4 w-4" />
              </button>
              <div className="w-10 text-center font-medium">{qty}</div>
              <button onClick={() => setQty((q) => q + 1)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Notes for the kitchen</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Extra chilli, no onions, etc."
              className="mt-2 w-full rounded-2xl border border-border bg-card/60 p-3 text-sm focus:border-gold/50 focus:outline-none"
            />
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => {
                add({ menu_item_id: it.id, name: it.name, price: Number(it.price), image_url: it.image_url, notes }, qty);
                toast.success(`Added ${qty} × ${it.name}`);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-background glow-gold"
            >
              <ShoppingBag className="h-4 w-4" /> Add to cart · {formatPrice(Number(it.price) * qty)}
            </button>
            <button
              onClick={() => {
                add({ menu_item_id: it.id, name: it.name, price: Number(it.price), image_url: it.image_url, notes }, qty);
                navigate({ to: "/cart" });
              }}
              className="rounded-full border border-border px-5 py-3 text-sm hover:border-gold/50"
            >
              Order now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
