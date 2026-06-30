import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — Mogudu Monday" },
      { name: "description", content: "Browse mogodu specials, mains, kotas, sides and drinks. Order online in minutes." },
      { property: "og:title", content: "Menu — Mogudu Monday" },
      { property: "og:description", content: "Browse mogodu specials, mains, kotas, sides and drinks." },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const { add } = useCart();

  const cats = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,slug,sort_order").order("sort_order");
      return data ?? [];
    },
  });

  const items = useQuery({
    queryKey: ["menu-items"],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("id,name,description,price,image_url,category_id,is_available")
        .eq("is_available", true)
        .order("name");
      return data ?? [];
    },
  });

  const filtered = (items.data ?? []).filter((it) => {
    if (cat && it.category_id !== cat) return false;
    if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-widest text-gold">The menu</div>
        <h1 className="mt-1 font-display text-4xl sm:text-5xl">Cooked fresh, every order</h1>
      </header>

      <div className="sticky top-16 z-30 -mx-4 mb-6 border-y border-border/50 bg-background/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes…"
              className="w-full rounded-full border border-border bg-card/60 py-2 pl-9 pr-3 text-sm focus:border-gold/50 focus:outline-none"
            />
          </div>
          <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 sm:mx-0 sm:pb-0">
            <button
              onClick={() => setCat(null)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${cat === null ? "border-gold bg-gold text-background" : "border-border text-muted-foreground hover:border-gold/30"}`}
            >
              All
            </button>
            {(cats.data ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${cat === c.id ? "border-gold bg-gold text-background" : "border-border text-muted-foreground hover:border-gold/30"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((it, i) => (
          <motion.article
            key={it.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 8) * 0.03 }}
            className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-gold/30"
          >
            <Link to="/menu/$itemId" params={{ itemId: it.id }} className="block aspect-[4/3] overflow-hidden">
              <img src={it.image_url ?? ""} alt={it.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
            </Link>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <Link to="/menu/$itemId" params={{ itemId: it.id }} className="font-display text-lg leading-tight hover:text-gold">
                  {it.name}
                </Link>
                <div className="shrink-0 font-medium text-gold">{formatPrice(it.price)}</div>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{it.description}</p>
              <button
                onClick={() => {
                  add({ menu_item_id: it.id, name: it.name, price: Number(it.price), image_url: it.image_url });
                  toast.success(`${it.name} added to cart`);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold hover:text-background"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </motion.article>
        ))}
        {items.isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-card/60" />
        ))}
        {!items.isLoading && filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground">No dishes match your search.</div>
        )}
      </div>
    </div>
  );
}
