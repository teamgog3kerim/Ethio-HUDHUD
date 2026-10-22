export type SandboxPlan = "monthly" | "six_month";

export function sandboxCustomerId(userId: string) {
  return `hudhud-sandbox:${userId}`;
}

// Calendar months, clamped at month end (not 180 days or Date's overflow).
export function sixMonthsAfter(value: string | Date) {
  const start = new Date(value);
  const end = new Date(start);
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 6);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(start.getUTCDate(), last));
  return end;
}

export function assertSandboxProduct(plan: SandboxPlan, product: {
  is_archived: boolean;
  is_recurring: boolean;
  recurring_interval?: string | null;
  recurring_interval_count?: number | null;
  prices: { amount_type: string; price_amount?: number | null; price_currency?: string | null; is_archived?: boolean }[];
}) {
  const prices = product.prices.filter(p => !p.is_archived);
  const price = prices.find(p => p.price_currency === "usd");
  if (product.is_archived || prices.length !== 1 || price?.amount_type !== "fixed"
    || price.price_amount !== (plan === "monthly" ? 2900 : 14900)
    || (plan === "monthly"
      ? !product.is_recurring || product.recurring_interval !== "month" || product.recurring_interval_count !== 1
      : product.is_recurring)) throw new Error("Polar sandbox product does not match the course offer");
}

export function safeSandboxUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "sandbox.polar.sh" || url.username || url.password) {
    throw new Error("Unexpected Polar sandbox URL");
  }
  return value;
}

export function paidOrderEligible(order: {
  paid: boolean; status: string; subtotal_amount: number; discount_amount: number;
  refunded_amount: number; currency: string; product_id: string | null;
}, productId: string, plan: SandboxPlan) {
  // No coupons, trials, free orders, or arbitrary product substitutions.
  return order.paid && order.status === "paid" && order.refunded_amount === 0
    && order.currency === "usd" && order.product_id === productId
    && order.discount_amount === 0 && order.subtotal_amount === (plan === "monthly" ? 2900 : 14900);
}
