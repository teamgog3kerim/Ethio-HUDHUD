import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { verifyLiveReceipt, LIVE_COURSE_PRODUCTS } from "./polar-live-webhook-policy";
import { BILLING_CONFIGURED, TRIAL_ENFORCEMENT_ENABLED } from "./billing-policy";

// Ephemeral fixture key only; never reads or signs with the real webhook secret.
const key = randomBytes(32);
const secret = `whsec_${key.toString("base64")}`;
const id = randomUUID();
const body = Buffer.from(JSON.stringify({
  type: "order.paid", data: {
    id, product_id: LIVE_COURSE_PRODUCTS.six_month, checkout_id: randomUUID(),
    // This PII must not survive normalization.
    customer: { email: "fixture@example.invalid", billing_address: "not retained" },
  },
}));
function headers(payload = body, time = Math.floor(Date.now() / 1000)) {
  const eventId = `fixture-${randomUUID()}`;
  return {
    "webhook-id": eventId, "webhook-timestamp": String(time),
    "webhook-signature": `v1,${createHmac("sha256", key).update(`${eventId}.${time}.${payload.toString()}`).digest("base64")}`,
  };
}
test("valid live receipt is pending, minimized, and never activates payment gates", async () => {
  const gates = [BILLING_CONFIGURED, TRIAL_ENFORCEMENT_ENABLED];
  const receipt = await verifyLiveReceipt(body, headers(), secret);
  assert.equal(receipt.resourceId, id);
  assert.equal(receipt.state, "pending");
  assert.equal(receipt.productId, LIVE_COURSE_PRODUCTS.six_month);
  assert.equal(receipt.bodyHash.length, 64);
  assert.ok(!JSON.stringify(receipt).includes("fixture@example"));
  assert.deepEqual([BILLING_CONFIGURED, TRIAL_ENFORCEMENT_ENABLED], gates);
  assert.equal(TRIAL_ENFORCEMENT_ENABLED, false);
});
test("unsigned and incorrect-key deliveries are rejected", async () => {
  await assert.rejects(verifyLiveReceipt(body, {}, secret), { status: 403 });
  await assert.rejects(verifyLiveReceipt(body, headers(), `whsec_${randomBytes(32).toString("base64")}`));
});
test("altered bytes or a substituted signed event ID are rejected", async () => {
  const h = headers();
  await assert.rejects(verifyLiveReceipt(Buffer.concat([body, Buffer.from(" ")]), h, secret));
  await assert.rejects(verifyLiveReceipt(body, { ...h, "webhook-id": randomUUID() }, secret));
});
test("stale and future signatures are rejected", async () => {
  await assert.rejects(verifyLiveReceipt(body, headers(body, Math.floor(Date.now() / 1000) - 600), secret));
  await assert.rejects(verifyLiveReceipt(body, headers(body, Math.floor(Date.now() / 1000) + 600), secret));
});
test("sandbox or unrelated product IDs are ignored rather than queued for course access", async () => {
  for (const productId of ["134ce7d5-dfaf-49ca-91eb-19859e4c6525", randomUUID()]) {
    const b = Buffer.from(JSON.stringify({ type: "order.paid", data: { id, product_id: productId } }));
    assert.equal((await verifyLiveReceipt(b, headers(b), secret)).state, "ignored");
  }
});
test("malformed resources are rejected even with a genuine signature", async () => {
  for (const data of [null, { id: "not-a-uuid" }, { id, product_id: "invalid" }]) {
    const b = Buffer.from(JSON.stringify({ type: "order.paid", data }));
    await assert.rejects(verifyLiveReceipt(b, headers(b), secret), { status: 400 });
  }
});
test("missing secret fails closed without processing a receipt", async () => {
  await assert.rejects(verifyLiveReceipt(body, headers(), ""), { status: 503 });
});
test("subscription and checkout resource IDs route correctly", async () => {
  for (const type of ["subscription.updated", "checkout.updated"]) {
    const b = Buffer.from(JSON.stringify({ type, data: { id, product_id: LIVE_COURSE_PRODUCTS.monthly } }));
    const receipt = await verifyLiveReceipt(b, headers(b), secret);
    assert.equal(type.startsWith("subscription.") ? receipt.subscriptionId : receipt.checkoutId, id);
  }
});
