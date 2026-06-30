import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/specials")({
  head: () => ({
    meta: [
      { title: "Weekly Specials — Mogudu Monday" },
      { name: "description", content: "A different special every day. Mogudu Mondays, Bunny Chow Tuesdays, Oxtail Fridays and more." },
      { property: "og:title", content: "Weekly Specials — Mogudu Monday" },
      { property: "og:description", content: "A different special every day of the week." },
    ],
  }),
  component: Specials,
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Specials() {
  const today = new Date().getDay();
  const q = useQuery({
    queryKey: ["specials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_specials")
        .select("day_of_week, note, menu_items(id, name, description, price, image_url)")
        .order("day_of_week");
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-10 text-center">
        <div className="text-xs uppercase tracking-widest text-gold">The week ahead</div>
        <h1 className="mt-2 font-display text-4xl sm:text-6xl">A different <span className="gold-text italic">special</span> every day</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">From Mogudu Mondays to Oxtail Fridays — see what's cooking and plan your week.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(q.data ?? []).map((s, i) => {
          const it: any = s.menu_items;
          const isToday = s.day_of_week === today;
          return (
            <motion.div
              key={s.day_of_week}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className={`group overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-1 ${
                isToday ? "border-gold glow-gold" : "border-border hover:border-gold/30"
              }`}
            >
              <div className="flex items-center justify-between px-5 pt-5">
                <div>
                  <div className={`text-xs uppercase tracking-widest ${isToday ? "text-gold" : "text-muted-foreground"}`}>{DAYS[s.day_of_week]}</div>
                  <div className="font-display text-xl">{DAYS_LONG[s.day_of_week]}</div>
                </div>
                {isToday && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-medium text-background">Today</span>}
              </div>
              {it && (
                <>
                  <div className="mt-3 aspect-[4/3] overflow-hidden">
                    <img src={it.image_url ?? ""} alt={it.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  <div className="p-5">
                    <Link to="/menu/$itemId" params={{ itemId: it.id }} className="font-display text-lg hover:text-gold">{it.name}</Link>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.note}</p>
                    <div className="mt-3 font-medium text-gold">{formatPrice(it.price)}</div>
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
