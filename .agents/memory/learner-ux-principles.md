---
name: Learner UX principles
description: User-requested principles for future Ethio HUDHUD interface work.
---

Keep decisions simple and reveal secondary choices when needed. Use comfortably
sized, spaced mobile controls and familiar navigation patterns. Group related
information, establish a clear primary action, reduce unnecessary fields and
explanations, handle technical complexity within the system, and make completion,
confirmation and error experiences clear and reassuring.

**Why:** The user explicitly requested these eight UX principles for how learners
think, decide and interact with this app.

**How to apply:** Use these principles when extending existing learner journeys.
Preserve Arabic-first/RTL readability and keyboard accessibility, and never
simplify away actual access restrictions, payment conditions or saved progress.

Keep subscription selection, checkout and billing management in one ordered
flow with a consistent main action. Do not add separate, competing purchase,
save-choice or billing buttons across different screens.

**Why:** The user explicitly requested that subscription components use the same
buttons appropriately for payment and billing rather than many scattered buttons.

**How to apply:** Other pages may link into the shared subscription flow. Its
action must reflect real account state: signup, trial, checkout, eligible manual
renewal, pending-payment check or billing portal. Do not add a preference-save
detour before payment or a disabled imitation subscription button.

Use the account-first learning journey: homepage free-trial action → Google
sign-up → lessons, with a single encouraging subscription banner during trial.
At expiry send learners to the two paid options; a plan's payment button opens
checkout directly, and verified effective access returns them to lessons.

**Why:** The user said the existing sign-in, trial and payment flow involved too
much processing and explicitly requested this simpler sequence.

**How to apply:** Avoid another plan-review/save screen after free sign-up or
after an informed paid-plan click. Keep admin records clear about trial dates,
actual recorded purchases, unfinished attempts and verification freshness;
a selected plan or pending attempt is not proof of paid access.

Keep the floating install button compact, with both its icon and visible text;
do not interpret “smaller” as a permanently icon-only button. While scrolling
up or down, temporarily shrink it to the icon and restore the text after idle.

**Why:** The user explicitly corrected the icon-only version and requested its
text back at a smaller size than the original button.

**How to apply:** Reduce padding, icon and text size while preserving an easy
tap target and the existing installation action. Keep automatic scroll shrinking
alongside the smaller resting button; the user explicitly requested both.
