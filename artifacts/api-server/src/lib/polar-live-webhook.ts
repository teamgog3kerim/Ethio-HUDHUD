import { db, polarLiveEvents } from "@workspace/db";
import { eq } from "drizzle-orm";
import { HttpError } from "./http-error";
import { verifyLiveReceipt, type LiveReceipt } from "./polar-live-webhook-policy";

export async function storeLiveReceipt(receipt: LiveReceipt) {
  return db.transaction(async tx => {
    const [inserted] = await tx.insert(polarLiveEvents).values(receipt)
      .onConflictDoNothing().returning({ id: polarLiveEvents.id });
    if (!inserted) {
      const [existing] = await tx.select({ bodyHash: polarLiveEvents.bodyHash }).from(polarLiveEvents)
        .where(eq(polarLiveEvents.id, receipt.id));
      if (!existing || existing.bodyHash !== receipt.bodyHash) {
        throw new HttpError(409, "Conflicting webhook delivery");
      }
    }
  });
}

export async function handleLiveWebhook(body: Buffer, headers: Record<string, string>) {
  // Intake is independent of checkout activation. Queued receipts cannot grant
  // access. Do not mark them processed until provider reconciliation succeeds.
  const receipt = await verifyLiveReceipt(body, headers, process.env.POLAR_LIVE_WEBHOOK_SECRET ?? "");
  await storeLiveReceipt(receipt);
}
