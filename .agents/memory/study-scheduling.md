---
name: Study scheduling semantics
description: Rationale for fitting optional scheduling to the existing six-month curriculum
---

Keep the six-month scope as 180 calendar days, not 180 selected study days.
Selecting fewer weekdays groups multiple existing activities on each eligible
day; it does not introduce extra lessons or promise faster learning.

**Why:** This is an optional scheduling layer on the existing six-month path.
Treating each activity as a separate study date would turn a one-day-per-week
preference into a multi-year plan and change the original scope.

**How to apply:** Explain the grouping when editing scheduling controls. Keep
elapsed suggested weeks and past suggestions distinct from real completion.
Scheduling must not award or revoke credit, change completion dates, or imply
notification consent.

Study reminders must support both interactive in-app notices and notifications
when the installed web app is closed. Notification permission is a separate
device choice; saving a schedule alone must not request it.

**Why:** The user explicitly chose both in-app and background study reminders.

**How to apply:** Preserve the learner's ability to continue, snooze, or dismiss
without changing lesson progress. Do not substitute foreground-only timers for
the requested closed-app behavior.

Do not treat a passing push test or an in-process delivery loop as proof of
reliable scheduled delivery on the published site.

**Why:** The website's Autoscale hosting can sleep when idle; a timer cannot run
in a stopped process. Provider acceptance also does not prove phone receipt.

**How to apply:** Confirm an always-running service or an authorized scheduled
runner before claiming timely closed-app reminders are launch-ready. Discuss
hosting-cost consequences with the owner before changing publishing settings,
and verify delivery on real supported installed devices.

Use always-on hosting for the study reminder service.

**Why:** The user explicitly selected always-on hosting for reliable background
reminders rather than keeping the current sleeping-host behavior.

**How to apply:** Prefer Reserved VM when guiding publishing configuration.
Do not silently replace this choice with idle-time delivery or a separate
scheduled runner. The owner still reviews hosting costs and confirms publishing.
