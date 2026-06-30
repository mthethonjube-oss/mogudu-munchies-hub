import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Bell, LogOut, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account — Mogudu Monday" }] }),
  component: Account,
});

function Account() {
  const { user, loading, signOut, isAdmin } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState("");
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth", search: { redirect: "/account" } }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setName(data.full_name ?? ""); setPhone(data.phone ?? ""); setAddr(data.default_address ?? ""); }
    });
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20).then(({ data }) => setNotifs(data ?? []));
  }, [user]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: name, phone, default_address: addr }).eq("id", user.id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <button onClick={() => signOut()} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm hover:border-destructive hover:text-destructive">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      {isAdmin && (
        <a href="/admin" className="mt-4 inline-block rounded-full bg-gold px-4 py-2 text-xs font-medium text-background">Open admin dashboard →</a>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-xl"><User className="h-4 w-4 text-gold" /> Profile</h2>
          <div className="mt-4 space-y-3 text-sm">
            <label className="block"><span className="text-xs text-muted-foreground">Full name</span><input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 focus:border-gold/50 focus:outline-none" /></label>
            <label className="block"><span className="text-xs text-muted-foreground">Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 focus:border-gold/50 focus:outline-none" /></label>
            <label className="block"><span className="text-xs text-muted-foreground">Default address</span><input value={addr} onChange={(e) => setAddr(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 focus:border-gold/50 focus:outline-none" /></label>
            <button onClick={save} className="rounded-full bg-gold px-4 py-2 text-xs font-medium text-background">Save</button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-xl"><Bell className="h-4 w-4 text-gold" /> Notifications</h2>
          <ul className="mt-4 divide-y divide-border text-sm">
            {notifs.map((n) => (
              <li key={n.id} className="py-3">
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground">{n.body} · {new Date(n.created_at).toLocaleString()}</div>
              </li>
            ))}
            {notifs.length === 0 && <li className="py-3 text-muted-foreground">No notifications yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
