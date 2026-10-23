---
name: Course pricing and trial
description: Course trial, pricing, approved live-access rules, and renewal notification requirements.
---

Let users try lessons or practical conversations free for two days. On the third day, prompt them to sign up and subscribe for full lessons and conversation courses.

Offer $29 USD per month during the six-month course, or a single $149 USD payment for six months of full course access.

Remind subscribers four days before their subscription needs renewal so they can continue the following month's courses.

**Why:** The user explicitly requested these trial, pricing, access-duration, and reminder terms.

**How to apply:** Keep access enforcement, pricing copy, checkout products, and reminders consistent. Six monthly payments total $174; the $149 option saves $25, approximately 14.4%. The original Polar provider requirement remains in effect until the user explicitly approves a replacement; do not grant paid access without verified payment.

The user initially deferred Polar setup, then explicitly requested completing the integration and confirmed that both live and sandbox Polar products exist. Start with sandbox integration and verification; live activation requires approval.

**Why:** The user has now requested Polar integration, without authorizing a provider replacement or an untested live rollout.

**How to apply:** Proceed with Polar sandbox checkout and verified entitlements. Keep live charges and paid-only restrictions disabled until implementation is verified and rollout approved. In-app alerts must not be described as email or background push delivery.

After exactly 48 hours, learners without valid access must be directed to a
$29 monthly or $149 six-month subscription instead of continuing lessons or
conversations. Activate the restriction for the next user-published build;
preserve progress and the original trial clock.

**Why:** After choosing to wait for the first genuine payment, the user
subsequently instructed: "New users gets 48 hour free trials , then must gets
forced to proceed with paid options." This supersedes the waiting condition.

**How to apply:** Enforce on the server as well as the learner interface.
Preserve administrator access and valid complimentary grants. Do not treat a
saved plan preference or sandbox payment as paid access. This approval enables
trial enforcement, not automatic charges, a real test purchase, or publication.
Provider readiness and checkout-update receipts still are not proof of a paid
order.

Sandbox purchases must never activate real paid entitlements or replace an
administrator's complimentary grant.

**Why:** Integration testing must not change real learners' access or make a test
payment appear to be money collected.

**How to apply:** Keep sandbox payment records separate from the live access
source. Treat enabling real billing and migrating existing pilot learners as an
explicitly approved rollout, not as an automatic consequence of saving a token.

Approved live-access rules: cancelling monthly renewal preserves access through
the paid period; failed renewals get three days' grace before paid lessons lock;
refunds are approved manually in Polar, with full refunds removing the associated
paid access and partial refunds leaving access unchanged. Preserve learning
progress and original trial dates.

**Why:** The user explicitly approved these proposed rules.

**How to apply:** Implement these rules for live billing without treating their
approval as permission to activate live payments. The user confirms that Polar
payout setup is complete and live payments are approved, and requests resuming
live integration step by step. Their customer refund policy is: "No refunds."
Implementation, verification, and explicit rollout approval remain necessary.

**Why:** The user confirmed both merchant readiness items and supplied the
refund policy when asked.

**How to apply:** State the no-refunds policy before checkout, without claiming
it overrides mandatory consumer rights or Polar's buyer terms. Preserve the
approved full/partial refund access handling for legally required or
provider-approved refunds, disputes, and corrections. Merchant readiness alone
does not activate checkout or expired-trial restrictions.

Offer all three choices on the public home page and learner home, and let learners choose a free trial, monthly, or six-month plan after sign-up before continuing to lessons.

**Why:** The user requested home-page plan visibility and a sign-up → plan choice → learning journey.

**How to apply:** Preserve this journey when enabling Polar later. Until verified payment exists, save monthly and six-month choices only as account preferences; never treat a choice as payment or restart the server-owned trial clock.

Use server-driven background renewal delivery, separate from device-local study alarms.

**Why:** Access can be revoked or extended while the learner is away. A native expiry alarm based only on the last app visit cannot observe that cancellation and may show an obsolete renewal notice.

**How to apply:** Keep renewal consent separate from study preferences and re-check the verified access source at dispatch. Do not replace remote delivery with local expiry scheduling merely to avoid native push setup. Report unavailable provider/build setup honestly and retain in-app notices.

Do not activate the monthly recurring product on a promise of six payments
without a reliable finite-payment safeguard, and do not silently substitute
manual monthly payments.

**Why:** The course policy is six months, but Polar's documented cancellation
API only schedules cancellation at the current period end. A cancellation
triggered by the sixth webhook alone can miss a seventh charge during an outage.

**How to apply:** Keep monthly checkout independently blocked until a
provider-enforced cap or an owner-approved alternative is verified. Autoscale
process timers and successful webhook tests are not proof of that guarantee.

Finalize the $149 six-month payment option first and keep monthly checkout
disabled.

**Why:** The user selected this launch scope rather than manual monthly renewals
or waiting for an automatic six-payment cap.

**How to apply:** Continue with the one-time Polar product without reopening the
monthly-plan decision. The user subsequently explicitly approved:
"Enable $149 checkout only; keep monthly and trial blocking off" for the next
published build.

**Why:** The user separately approved the checkout activation and its real
payment consequences after choosing the six-month-first scope.

**How to apply:** Enable only the one-time checkout in the prepared build.
Keep the original recurring monthly product and expired-trial blocking disabled.
The newer manual-monthly approval below supersedes the hold on adding any
monthly payment option. Do not ask for the same $149 activation approval again.
Publication stays user-controlled, and the agent is not authorized to make a
real purchase.

Implement and enable manual $29 monthly renewals after testing. Learners choose
to pay again each month; no automatic charges. Limit the course to six monthly
payments ($174 total), and retain $149 once for six months. The original
trial-blocking-off condition is superseded by the newer activation rule above.

**Why:** The user explicitly selected "Implement and enable manual $29 renewals
after testing" after the automatic six-payment cap could not be verified.

**How to apply:** Use a separate $29 one-time Polar product, not the original
recurring product. This is approval to implement and activate the tested manual
option in the next user-published build, not approval for the agent to purchase
or publish. Preserve account ownership, duplicate-payment protection, progress,
grants, and original trial dates.

Manual renewals open four days before the last paid coverage ends. Early
renewal follows existing coverage; after a gap, a new payment starts a new
one-month period. Full refunds remove only the associated period, without
bringing a future prepaid period forward. Completed payments still consume
the six-payment limit even if refunded; failed/unpaid attempts do not.

**Why:** Manual renewal must not shorten paid time, unlock a future period
prematurely, or let a refund/replay reset the six-payment safeguard.

**How to apply:** Preserve immutable payment proof and period boundaries.
Use the furthest prepaid coverage end for reminders; do not invite a seventh
renewal. The earlier three-day failed-automatic-renewal grace applies only if
automatic billing is separately approved in future, not to manual purchases.

Native renewal pushes must check current device/account consent before presentation, not rely on unregistering a push token alone.

**Why:** A queued push can outlive sign-out or reach a token reused by another account. Automatic OS alert payloads bypass the app's account check.

**How to apply:** Preserve data-only delivery with account-bound background presentation when connecting real native push credentials. Opt-out must remain retryable after local account flags have been cleared or the network request fails.

Notification-provider availability must never become a prerequisite for signing out.

**Why:** Requiring an authenticated withdrawal request made ordinary sign-out fail during API outages, even for learners who had never enabled renewal notifications.

**How to apply:** Persist local withdrawal and retryable revocation first; sign-out does remote cleanup best-effort and sends nothing for never-enrolled devices. Explicit reminder-settings opt-out must still be able to disable a server registration when local ownership flags are already cleared.
