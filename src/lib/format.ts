export const ZAR = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

export const formatPrice = (n: number | string) => {
  const v = typeof n === "string" ? Number(n) : n;
  return ZAR.format(Number.isFinite(v) ? v : 0);
};

export const STATUS_LABELS: Record<string, string> = {
  placed: "Order placed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_STEPS = ["placed", "preparing", "out_for_delivery", "delivered"] as const;
