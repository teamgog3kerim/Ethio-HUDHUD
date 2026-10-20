import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedPushAddress, deviceBindingKey, renewalPeriod } from "./renewal-policy";

test("renewal dispatch is exactly four elapsed days before a verified expiry, through expiry only", () => {
  const reminder = { kind: "renewal_due" as const, expiresAt: "2026-11-02T12:00:00Z" };
  assert.equal(renewalPeriod("device", reminder, new Date("2026-10-29T11:59:59Z"))?.due, false);
  assert.equal(renewalPeriod("device", reminder, new Date("2026-10-29T12:00:00Z"))?.due, true);
  assert.equal(renewalPeriod("device", reminder, new Date("2026-11-02T11:59:59Z"))?.due, true);
  assert.equal(renewalPeriod("device", reminder, new Date(reminder.expiresAt)), null);
});
test("timezone/DST changes cannot create another delivery key", () => {
  const a = renewalPeriod("device", { kind: "complimentary_expiring", expiresAt: "2026-11-02T12:00:00Z" }, new Date("2026-10-29T12:00:00Z"));
  const b = renewalPeriod("device", { kind: "complimentary_expiring", expiresAt: "2026-11-02T07:00:00-05:00" }, new Date("2026-10-30T12:00:00Z"));
  assert.equal(a?.id, b?.id);
  assert.equal(a?.at, "2026-10-29T12:00:00.000Z");
});
test("queued pushes from another account cannot match the same physical browser's binding", () => {
  assert.notEqual(deviceBindingKey("account-a", "device"), deviceBindingKey("account-b", "device"));
  assert.equal(deviceBindingKey("account-a", "device"), deviceBindingKey("account-a", "device"));
});
test("period keys separate devices, source kinds, and changed expiry dates", () => {
  const now = new Date("2026-10-29T12:00:00Z");
  const reminder = { kind: "course_expiring" as const, expiresAt: "2026-11-02T12:00:00Z" };
  const id = renewalPeriod("a", reminder, now)?.id;
  assert.notEqual(id, renewalPeriod("b", reminder, now)?.id);
  assert.notEqual(id, renewalPeriod("a", { ...reminder, kind: "renewal_due" }, now)?.id);
  assert.notEqual(id, renewalPeriod("a", { ...reminder, expiresAt: "2026-11-03T12:00:00Z" }, now)?.id);
  assert.equal(renewalPeriod("a", { ...reminder, expiresAt: "invalid" }, now), null);
});
test("push endpoints are confined to supported public browser push services", () => {
  for (const address of ["https://fcm.googleapis.com/fcm/send/abc", "https://web.push.apple.com/test", "https://updates.push.services.mozilla.com/wpush/v2/test"])
    assert.equal(allowedPushAddress(address), true);
  for (const address of ["http://fcm.googleapis.com/a", "https://localhost/a", "https://127.0.0.1/a", "https://fcm.googleapis.com.evil.test/a", "https://u:p@fcm.googleapis.com/a", "https://fcm.googleapis.com:444/a", "invalid"])
    assert.equal(allowedPushAddress(address), false);
});
