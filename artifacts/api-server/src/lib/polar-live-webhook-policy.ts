import { createHash } from "node:crypto";
import { webhooks } from "@polar-sh/sdk/2026-10";
import { z } from "zod";
import { HttpError } from "./http-error";

export const LIVE_COURSE_PRODUCTS = {
  monthly: "2ddb1c73-8e1e-404b-926c-af93db682651",
  six_month: "7894c8ae-bf15-4aec-973b-635bf0521920",
} as const;

const eventTypes = new Set([
  "checkout.updated", "checkout.expired", "order.paid", "order.updated",
  "order.refunded", "subscription.created", "subscription.updated",
  "subscription.past_due", "subscription.canceled", "subscription.revoked",
]);
const resource = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid().nullish(),
  checkout_id: z.string().uuid().nullish(),
  subscription_id: z.string().uuid().nullish(),
});

export async function verifyLiveReceipt(body: Buffer, headers: Record<string, string>, secret: string) {
  if (!secret) throw new HttpError(503, "Live webhook is not configured");
  const eventId = headers["webhook-id"];
  if (!eventId || eventId.length > 255) throw new HttpError(403, "Invalid webhook signature");
  let event;
  try {
    // SDK verifies the exact bytes, signed ID, timestamp and rotation signatures.
    // It does not validate resource fields; validate those explicitly below.
    event = await webhooks.validateEvent(body, headers, secret);
  } catch {
    throw new HttpError(403, "Invalid or unsupported signed webhook");
  }
  const data = resource.safeParse(event.data);
  if (!data.success) throw new HttpError(400, "Invalid webhook resource");
  const { id, product_id, checkout_id, subscription_id } = data.data;
  const acceptedProduct = !!product_id && Object.values(LIVE_COURSE_PRODUCTS).some(p => p === product_id);
  return {
    id: eventId, type: event.type, resourceId: id,
    checkoutId: event.type.startsWith("checkout.") ? id : checkout_id ?? null,
    subscriptionId: event.type.startsWith("subscription.") ? id : subscription_id ?? null,
    productId: product_id ?? null,
    bodyHash: createHash("sha256").update(body).digest("hex"),
    // Unknown products never become this course's paid access.
    state: eventTypes.has(event.type) && acceptedProduct ? "pending" : "ignored",
  };
}

export type LiveReceipt = Awaited<ReturnType<typeof verifyLiveReceipt>>;
