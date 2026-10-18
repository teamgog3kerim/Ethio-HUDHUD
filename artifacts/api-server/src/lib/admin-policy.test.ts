import { test } from "node:test";
import assert from "node:assert/strict";
import { canManageTarget, isComplimentary, normalizeRole, assertAccountUsable } from "./admin-policy";
test("deleted identities are rejected even when an old session token is still valid", () => {
  assert.throws(() => assertAccountUsable({ suspended: true, deletedAt: new Date() }), { status: 401 });
  assert.throws(() => assertAccountUsable({ suspended: true, deletedAt: null }), { status: 403 });
  assert.doesNotThrow(() => assertAccountUsable({ suspended: false, deletedAt: null }));
  assert.doesNotThrow(() => assertAccountUsable(undefined));
});
test("unrecognized and client-provided roles never gain authority", () => {
  assert.equal(normalizeRole(undefined), "learner");
  assert.equal(normalizeRole("superadmin"), "learner");
  assert.equal(normalizeRole("owner"), "owner");
});
test("learners cannot administer accounts", () => {
  assert.equal(canManageTarget("learner", "a", "learner", "b", false), false);
});
test("admin cannot alter owner or another administrator", () => {
  assert.equal(canManageTarget("admin", "a", "owner", "b", false), false);
  assert.equal(canManageTarget("admin", "a", "admin", "b", true), false);
  assert.equal(canManageTarget("admin", "a", "learner", "b", true), true);
});
test("owner can administer others but destructive self-actions are forbidden", () => {
  assert.equal(canManageTarget("owner", "a", "admin", "b", true), true);
  assert.equal(canManageTarget("owner", "a", "owner", "a", true), false);
  assert.equal(canManageTarget("owner", "a", "owner", "a", false), true);
});
test("complimentary grants require enabled state and a future expiry", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  assert.equal(isComplimentary(undefined, now), false);
  assert.equal(isComplimentary({ enabled: true, expiresAt: null }, now), false);
  assert.equal(isComplimentary({ enabled: true, expiresAt: new Date("2026-10-17") }, now), false);
  assert.equal(isComplimentary({ enabled: false, expiresAt: new Date("2026-11-01") }, now), false);
  assert.equal(isComplimentary({ enabled: true, expiresAt: new Date("2026-11-01") }, now), true);
});
