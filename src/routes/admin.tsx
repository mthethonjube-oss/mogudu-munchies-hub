import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { motion } from "framer-motion";
import { TrendingUp, ShoppingBag, DollarSign, Users } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";
import { useServerFn } from "@tanstack/react-start";
import { updateOrderStatus } from "@/lib/orders.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Mogudu Monday" }] }),
  component: Admin,
});

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let r = 0; const start = performance.now(); const dur = 800;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      r = value * (1 - Math.pow(1 - p, 3));
      setN(r);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{prefix}{Math.round(n).toLocaleString()}{suffix}</>;
}

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const update = useServerFn(updateOrderStatus);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { redirect: "/admin" } });
  }, [user, loading, nav]);

  const orders = useQuery({
    queryKey: ["admin-orders"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id,status,total,created_at,is_demo,address,user_id").order("created_at", { ascending: false }).limit(2000);
      return data ?? [];
    },
  });

  const topItems = useQuery({
    queryKey: ["top-items"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("name, qty").limit(5000);
      const m = new Map<string, number>();
      (data ?? []).forEach((r: any) => m.set(r.name, (m.get(r.name) ?? 0) + r.qty));
      return Array.from(m.entries()).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);
    },
  });

  if (!user) return null;
  if (!loading && !isAdmin) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl">Admin access required</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your account doesn't have the admin role. Ask the owner to grant it.</p>
      <p className="mt-2 text-xs text-muted-foreground">User ID: <code className="text-gold">{user.id}</code></p>
    </div>
  );

  const data = orders.data ?? [];
  const delivered = data.filter((o) => o.status === "delivered");

  // 6-month series
  const months: { label: string; revenue: number; orders: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = startOfMonth(subMonths(new Date(), i));
    const next = startOfMonth(subMonths(new Date(), i - 1));
    const inMonth = delivered.filter((o) => {
      const d = new Date(o.created_at);
      return d >= m && d < next;
    });
    months.push({
      label: format(m, "MMM"),
      revenue: inMonth.reduce((s, o) => s + Number(o.total), 0),
      orders: inMonth.length,
    });
  }

  const totalRevenue = delivered.reduce((s, o) => s + Number(o.total), 0);
  const todayCount = data.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString()).length;
  const activeCount = data.filter((o) => ["placed", "preparing", "out_for_delivery"].includes(o.status)).length;

  const statusBreakdown = (["placed", "preparing", "out_for_delivery", "delivered", "cancelled"] as const).map((s, i) => ({
    name: s, value: data.filter((o) => o.status === s).length,
    color: ["#F4C76A", "#D4A24C", "#B8862F", "#8B6914", "#6B5B73"][i],
  }));

  const activeOrders = data.filter((o) => !o.is_demo && ["placed", "preparing", "out_for_delivery"].includes(o.status)).slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-gold">Admin</div>
          <h1 className="mt-1 font-display text-4xl">Dashboard</h1>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Revenue (6mo)", value: totalRevenue, icon: DollarSign, currency: true },
          { label: "Total orders", value: data.length, icon: ShoppingBag },
          { label: "Today", value: todayCount, icon: TrendingUp },
          { label: "Active now", value: activeCount, icon: Users },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{k.label}</span><k.icon className="h-4 w-4 text-gold" /></div>
            <div className="mt-2 font-display text-3xl">
              {k.currency ? <>R<AnimatedNumber value={k.value} /></> : <AnimatedNumber value={k.value} />}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-display text-lg">Revenue · last 6 months</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <LineChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                <XAxis dataKey="label" stroke="oklch(0.72 0.02 80)" fontSize={12} />
                <YAxis stroke="oklch(0.72 0.02 80)" fontSize={12} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.008 60)", border: "1px solid oklch(0.78 0.13 80 / 30%)", borderRadius: 12 }} formatter={(v: any) => formatPrice(v)} />
                <Line type="monotone" dataKey="revenue" stroke="oklch(0.78 0.13 80)" strokeWidth={3} dot={{ fill: "oklch(0.78 0.13 80)", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg">Order status</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {statusBreakdown.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.20 0.008 60)", border: "1px solid oklch(0.78 0.13 80 / 30%)", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-display text-lg">Orders per month</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                <XAxis dataKey="label" stroke="oklch(0.72 0.02 80)" fontSize={12} />
                <YAxis stroke="oklch(0.72 0.02 80)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.008 60)", border: "1px solid oklch(0.78 0.13 80 / 30%)", borderRadius: 12 }} />
                <Bar dataKey="orders" fill="oklch(0.78 0.13 80)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg">Top dishes</h2>
          <ul className="mt-4 space-y-3">
            {(topItems.data ?? []).map((t, i) => (
              <li key={t.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="gold-text font-display text-lg">#{i + 1}</span>{t.name}</span>
                <span className="text-muted-foreground">{t.qty}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Active orders queue */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl">Active orders</h2>
        {activeOrders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No active customer orders right now.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2 text-left">Order</th><th className="text-left">Address</th><th>Total</th><th>Status</th><th>Update</th></tr></thead>
              <tbody className="divide-y divide-border">
                {activeOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3">#{o.id.slice(0, 8)}</td>
                    <td className="text-muted-foreground">{o.address}</td>
                    <td className="text-center text-gold">{formatPrice(o.total)}</td>
                    <td className="text-center text-xs">{o.status}</td>
                    <td className="text-right">
                      <select
                        defaultValue={o.status}
                        onChange={async (e) => {
                          try {
                            await update({ data: { orderId: o.id, status: e.target.value as any, eta_minutes: e.target.value === "out_for_delivery" ? 30 : undefined } });
                            toast.success("Updated");
                            orders.refetch();
                          } catch (err: any) { toast.error(err.message); }
                        }}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                      >
                        {["placed", "preparing", "out_for_delivery", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
