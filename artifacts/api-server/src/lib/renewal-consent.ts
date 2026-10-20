import { createHash } from "node:crypto";
import { db, renewalDevices } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { deviceBindingKey } from "./renewal-policy";

// A disable-only capability is safe to use with no session or a different
// current account. It is useless for reading or enrolling a device.
export async function revokeDeviceConsent(id: string, input: { revocationToken: string; bindingKey: string }) {
  await db.transaction(async tx => {
    await tx.execute(sql`select id from renewal_devices where id = ${id} for no key update`);
    const [device] = await tx.select().from(renewalDevices).where(and(
      eq(renewalDevices.id, id),
      eq(renewalDevices.revocationHash, createHash("sha256").update(input.revocationToken).digest("hex")),
    ));
    if (device && deviceBindingKey(device.userId, id) === input.bindingKey)
      await tx.update(renewalDevices).set({ state: "disabled", updatedAt: new Date() }).where(eq(renewalDevices.id, id));
  });
}
