import type { LivePurchase } from "@workspace/db";
import { HttpError } from "./http-error";
import { liveCustomerId, safeLiveUrl } from "./polar-live-policy";
import { LIVE_COURSE_PRODUCTS } from "./polar-live-webhook-policy";

type Purchase = Pick<LivePurchase, "checkoutId" | "verifiedAt" | "status" | "paidUntil" | "monthlyPaidAt" | "plan">;

// Opening a checkout does not create a Polar customer. Receipts remain available
// after paid coverage ends or is refunded, but an abandoned checkout is not a purchase.
export function hasLiveBillingHistory(row: Purchase) {
  return !!row.checkoutId && !!row.verifiedAt
    && (!!row.paidUntil || !!row.monthlyPaidAt || row.status === "paid" || row.status === "refunded");
}

type PortalApi = {
  getCheckout: (id: string) => Promise<{
    customer_id?: string | null;
    external_customer_id?: string | null;
    product_id?: string | null;
  }>;
  createSession: (input: { customer_id: string; return_url: string }) => Promise<{ customer_portal_url: string }>;
};

export async function openLiveBillingPortal(userId: string, purchase: Purchase | undefined, api: PortalApi) {
  if (!purchase?.checkoutId || !hasLiveBillingHistory(purchase)) {
    throw new HttpError(409, "تتوفر بوابة الفوترة بعد أول دفعة مكتملة. إذا كان لديك دفع غير مكتمل، استأنفه أو تحقّق من حالته من صفحة الاشتراك.");
  }
  const checkout = await api.getCheckout(purchase.checkoutId);
  const productId = LIVE_COURSE_PRODUCTS[purchase.plan as keyof typeof LIVE_COURSE_PRODUCTS];
  if (!productId || checkout.external_customer_id !== liveCustomerId(userId) || checkout.product_id !== productId) {
    throw new HttpError(403, "عملية الدفع غير مرتبطة بهذا الحساب أو الخطة.");
  }
  if (!checkout.customer_id) {
    throw new HttpError(409, "لم يؤكد Polar حساب الفوترة بعد. تحقّق من حالة الدفع من صفحة الاشتراك ثم أعد المحاولة.");
  }
  // Use the actual customer from the account-owned checkout, not an unresolved
  // external ID. Never create a customer or a second checkout to open the portal.
  const session = await api.createSession({
    customer_id: checkout.customer_id, return_url: "https://ethiohudhud.com/choose-plan",
  });
  return { environment: "live" as const, url: safeLiveUrl(session.customer_portal_url) };
}
