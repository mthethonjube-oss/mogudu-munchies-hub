import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Clock, MapPin, Star, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mogudu Monday — Authentic Flavour, Every Monday" },
      { name: "description", content: "Authentic African mogodu, mains, kotas and combos delivered fresh. Browse the menu and order in minutes." },
      { property: "og:title", content: "Mogudu Monday — Authentic Flavour, Every Monday" },
      { property: "og:description", content: "Authentic African mogodu, mains, kotas and combos delivered fresh." },
    ],
  }),
  component: Landing,
});

function useFeatured() {
  return useQuery({
    queryKey: ["featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("id,name,description,price,image_url")
        .eq("is_featured", true)
        .limit(6);
      return data ?? [];
    },
  });
}

function useTodaySpecial() {
  return useQuery({
    queryKey: ["today-special"],
    queryFn: async () => {
      const dow = new Date().getDay();
      const { data } = await supabase
        .from("weekly_specials")
        .select("note, menu_items(id, name, description, price, image_url)")
        .eq("day_of_week", dow)
        .maybeSingle();
      return data;
    },
  });
}

function Landing() {
  const featured = useFeatured();
  const today = useTodaySpecial();

  return (
    <div>
      {/* HERO */}
      <section className="grain relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,oklch(0.78_0.13_80/0.18),transparent_60%),radial-gradient(ellipse_at_bottom_left,oklch(0.62_0.13_75/0.12),transparent_55%)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-14 pb-20 sm:px-6 md:grid-cols-2 md:gap-12 md:pt-24 md:pb-28">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold"
            >
              <Star className="h-3 w-3 fill-gold" /> Mondays since day one
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 font-display text-5xl font-bold leading-[1.05] sm:text-6xl md:text-7xl"
            >
              Authentic Flavour, <br />
              Every <span className="gold-text italic">Monday</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Slow-cooked mogodu, flame-grilled mains and township classics. Order ahead, track in real-time, and taste the tradition.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                to="/menu"
                className="group inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-background transition-all hover:scale-[1.03] glow-gold"
              >
                Order now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/specials"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-6 py-3 text-sm hover:border-gold/40 hover:bg-card"
              >
                This week's specials
              </Link>
            </motion.div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold" /> 30–45 min delivery</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" /> Greater Johannesburg</div>
              <div className="flex items-center gap-2"><Utensils className="h-4 w-4 text-gold" /> Cooked to order</div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <div className="aspect-[4/5] overflow-hidden rounded-3xl border border-gold/20 bg-card glow-gold">
              <img
                src="https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&q=80"
                alt="Mogodu plated with pap and chakalaka"
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
            {today.data?.menu_items && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="absolute -bottom-4 -left-4 max-w-xs rounded-2xl border border-gold/30 bg-background/95 p-4 backdrop-blur sm:-bottom-6 sm:-left-6"
              >
                <div className="text-[10px] uppercase tracking-widest text-gold">Today's special</div>
                <div className="mt-1 font-display text-xl">{(today.data.menu_items as any).name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{today.data.note}</div>
                <div className="mt-2 font-medium text-gold">{formatPrice((today.data.menu_items as any).price)}</div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { n: "01", t: "Browse the menu", d: "Mogodu specials, mains, kotas, sides and drinks — refreshed weekly." },
            { n: "02", t: "Place your order", d: "Add to cart, set delivery, pay on arrival. Done in under a minute." },
            { n: "03", t: "Track in real time", d: "Watch your meal leave the kitchen and arrive at your door." },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-card/50 p-6 transition-all hover:border-gold/30 hover:bg-card"
            >
              <div className="gold-text font-display text-4xl font-bold">{s.n}</div>
              <div className="mt-3 font-display text-xl">{s.t}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-gold">Customer favourites</div>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl">Most ordered this season</h2>
          </div>
          <Link to="/menu" className="hidden text-sm text-muted-foreground hover:text-gold sm:inline-flex">
            View full menu →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(featured.data ?? []).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to="/menu/$itemId"
                params={{ itemId: item.id }}
                className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-gold/30"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={item.image_url ?? ""}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-display text-lg leading-tight">{item.name}</div>
                    <div className="shrink-0 font-medium text-gold">{formatPrice(item.price)}</div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grain relative overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-card to-background p-10 text-center sm:p-16">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,oklch(0.78_0.13_80/0.18),transparent_70%)]" />
          <h2 className="font-display text-3xl sm:text-5xl">
            Hungry yet?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Sign in once, save your address, and reorder your favourites in two taps.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/menu" className="rounded-full bg-gold px-6 py-3 text-sm font-medium text-background glow-gold">
              Browse the menu
            </Link>
            <Link to="/auth" className="rounded-full border border-border px-6 py-3 text-sm">
              Create account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
