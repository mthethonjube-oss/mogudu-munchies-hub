import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, ChefHat, Bike, PackageCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, STATUS_LABELS, STATUS_STEPS } from "@/lib/format";

export const Route = createFileRoute("/orders/$orderId")({
  component: OrderDetail,
});

const ICONS = [Clock, ChefHat, Bike, PackageCheck];

function OrderDetail() {
  const { orderId } = Route.useParams();
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);

  const q = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,status,total,subtotal,delivery_fee,address,lat,lng,eta_at,driver_id,created_at,order_items(name,qty,unit_price)")
        .eq("id", orderId)
        .maybeSingle();
      return data;
    },
    refetchInterval: 10_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, () => q.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, q]);

  useEffect(() => {
    if (!q.data?.driver_id) return;
    const did = q.data.driver_id;
    supabase.from("driver_locations").select("lat,lng").eq("driver_id", did).maybeSingle().then(({ data }) => {
      if (data) setDriverLoc({ lat: data.lat, lng: data.lng });
    });
    const ch = supabase
      .channel(`driver-${did}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_locations", filter: `driver_id=eq.${did}` }, (p) => {
        const r: any = p.new;
        if (r?.lat) setDriverLoc({ lat: r.lat, lng: r.lng });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [q.data?.driver_id]);

  if (q.isLoading) return <div className="mx-auto max-w-4xl px-4 py-20">Loading…</div>;
  if (!q.data) return <div className="mx-auto max-w-4xl px-4 py-20">Order not found.</div>;
  const o = q.data;
  const stepIndex = STATUS_STEPS.indexOf(o.status as any);

  const customerLL = o.lat && o.lng ? `${o.lat},${o.lng}` : "-26.2041,28.0473";
  const browserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const mapSrc = driverLoc
    ? `https://www.google.com/maps/embed/v1/directions?key=${browserKey}&origin=${driverLoc.lat},${driverLoc.lng}&destination=${customerLL}&mode=driving`
    : `https://www.google.com/maps/embed/v1/place?key=${browserKey}&q=${customerLL}&zoom=14`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold"><ArrowLeft className="h-4 w-4" /> All orders</Link>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Order #{o.id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
        </div>
        <div className="rounded-full bg-gold px-3 py-1 text-xs font-medium text-background">{STATUS_LABELS[o.status]}</div>
      </div>

      {o.status !== "cancelled" && o.status !== "delivered" && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-gold/30">
          <iframe key={mapSrc} src={mapSrc} className="h-72 w-full" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
          {o.eta_at && <div className="bg-card p-3 text-center text-sm">Estimated arrival: <span className="text-gold">{new Date(o.eta_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>}
        </div>
      )}

      {/* Timeline */}
      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {STATUS_STEPS.map((s, i) => {
          const Icon = ICONS[i];
          const done = i <= stepIndex;
          return (
            <motion.div key={s} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`rounded-2xl border p-4 text-center ${done ? "border-gold bg-gold/10" : "border-border bg-card"}`}>
              <Icon className={`mx-auto h-5 w-5 ${done ? "text-gold" : "text-muted-foreground"}`} />
              <div className={`mt-2 text-xs ${done ? "text-foreground" : "text-muted-foreground"}`}>{STATUS_LABELS[s]}</div>
              {done && <Check className="mx-auto mt-1 h-3.5 w-3.5 text-gold" />}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl">Items</h2>
        <ul className="mt-3 divide-y divide-border">
          {(o.order_items ?? []).map((it: any, i: number) => (
            <li key={i} className="flex justify-between py-2 text-sm">
              <span>{it.qty} × {it.name}</span>
              <span className="text-muted-foreground">{formatPrice(Number(it.unit_price) * it.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(o.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{formatPrice(o.delivery_fee)}</dd></div>
          <div className="flex justify-between text-base"><dt>Total</dt><dd className="font-medium text-gold">{formatPrice(o.total)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">Delivering to: {o.address}</p>
      </div>
    </div>
  );
}
