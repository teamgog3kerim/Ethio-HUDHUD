import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceSignupNotifications,
  createSignupNotificationState,
  dismissSignupNotifications,
  isSignupNotificationState,
} from "./admin-signup-notifications";

test("first admin visit establishes a baseline without notifying for existing accounts", () => {
  assert.deepEqual(createSignupNotificationState(25), {
    observedAccountCount: 25,
    unreadSignupCount: 0,
  });
});

test("new account count increases become persistent unread notifications", () => {
  const initial = createSignupNotificationState(25);
  const afterTwoSignups = advanceSignupNotifications(initial, 27);
  assert.deepEqual(afterTwoSignups, { observedAccountCount: 27, unreadSignupCount: 2 });
  assert.deepEqual(advanceSignupNotifications(afterTwoSignups, 27), afterTwoSignups);
  assert.deepEqual(advanceSignupNotifications(afterTwoSignups, 28), {
    observedAccountCount: 28,
    unreadSignupCount: 3,
  });
});

test("account removals do not create notices and dismissal preserves the latest baseline", () => {
  const afterSignup = advanceSignupNotifications(createSignupNotificationState(25), 27);
  const afterRemoval = advanceSignupNotifications(afterSignup, 26);
  assert.deepEqual(afterRemoval, { observedAccountCount: 26, unreadSignupCount: 2 });
  assert.deepEqual(dismissSignupNotifications(afterRemoval), {
    observedAccountCount: 26,
    unreadSignupCount: 0,
  });
});

test("stored notification snapshots reject malformed values", () => {
  assert.equal(isSignupNotificationState({ observedAccountCount: 3, unreadSignupCount: 1 }), true);
  assert.equal(isSignupNotificationState({ observedAccountCount: -1, unreadSignupCount: 1 }), false);
  assert.equal(isSignupNotificationState({ observedAccountCount: 3, unreadSignupCount: "1" }), false);
  assert.equal(isSignupNotificationState(null), false);
});
