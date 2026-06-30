import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const itemSchema = z.object({
  menu_item_id: z.string().uuid(),
  qty: z.number().int().min(1).max(50),
  notes: z.string().max(200).optional(),
});

const placeSchema = z.object({
  items: z.array(itemSchema).min(1).max(30),
  address: z.string().min(3).max(300),
  lat: z.number(),
  lng: z.number(),
  notes: z.string().max(300).optional(),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => placeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Server-side recompute prices from DB
    const ids = data.items.map((i) => i.menu_item_id);
    const { data: dbItems, error: itemsErr } = await supabase
      .from("menu_items")
      .select("id,name,price,is_available")
      .in("id", ids);
    if (itemsErr) throw itemsErr;
    if (!dbItems || dbItems.length !== ids.length) throw new Error("Some items are unavailable");

    let subtotal = 0;
    const rows = data.items.map((i) => {
      const m = dbItems.find((x) => x.id === i.menu_item_id);
      if (!m || !m.is_available) throw new Error(`Item unavailable: ${i.menu_item_id}`);
      const price = Number(m.price);
      subtotal += price * i.qty;
      return { menu_item_id: m.id, name: m.name, qty: i.qty, unit_price: price, notes: i.notes ?? null };
    });

    const delivery_fee = 35;
    const total = subtotal + delivery_fee;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        status: "placed",
        subtotal,
        delivery_fee,
        total,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        notes: data.notes,
      })
      .select("id")
      .single();
    if (orderErr) throw orderErr;

    const { error: oiErr } = await supabase
      .from("order_items")
      .insert(rows.map((r) => ({ ...r, order_id: order.id })));
    if (oiErr) throw oiErr;

    // Create a notification for the user
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Order placed",
      body: "We've received your order and will start cooking shortly.",
      link: `/orders/${order.id}`,
    });

    return { orderId: order.id };
  });

const statusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["placed", "preparing", "out_for_delivery", "delivered", "cancelled"]),
  eta_minutes: z.number().int().min(1).max(180).optional(),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => statusSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify admin
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const patch: { status: typeof data.status; eta_at?: string } = { status: data.status };
    if (data.eta_minutes) patch.eta_at = new Date(Date.now() + data.eta_minutes * 60_000).toISOString();
    const { error } = await supabase.from("orders").update(patch).eq("id", data.orderId);
    if (error) throw error;
    return { ok: true };
  });
