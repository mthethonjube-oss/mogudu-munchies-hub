import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, STATUS_LABELS } from "@/lib/format";
import { useEffect } from "react";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders — Mthetho's Cultural Food" }] }),
  component: Orders,
});

function Orders() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !user) nav({ to: "/auth", search: { redirect: "/orders" } }); }, [user, loading, nav]);

  const q = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id,status,total,created_at,address").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl">Your orders</h1>
      <div className="mt-8 space-y-3">
        {(q.data ?? []).map((o) => (
          <Link key={o.id} to="/orders/$orderId" params={{ orderId: o.id }} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 hover:border-gold/30">
            <div className="min-w-0">
              <div className="font-display text-lg">Order #{o.id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
              <div className="mt-1 text-xs text-muted-foreground truncate">{o.address}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-gold">{STATUS_LABELS[o.status]}</div>
              <div className="mt-1 font-medium">{formatPrice(o.total)}</div>
            </div>
          </Link>
        ))}
        {q.data && q.data.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
      </div>
    </div>
  );
}
