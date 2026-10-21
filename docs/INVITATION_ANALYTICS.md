# Website invitation analytics

Website-only events use the existing privacy-gated analytics helper and only the
platform-injected tracker. No script, tracker ID, analytics provider or native
instrumentation is added.

Invitation events require an explicit `on` analytics preference as well as the
current privacy helper's permission. No preference, consent off, DNT, GPC,
external tracker opt-out, unavailable storage or an absent tracker means no
invitation event. Skipped events are not queued or replayed.

The Account analytics control discloses invitation measurement in Arabic and
English. With no saved choice it is unchecked and explicitly says invitation
measurement is off, even if legacy pageview permission is enabled. Turning it on
once saves explicit consent; visitors do not need to turn it off and on first.

| Description | Event name | Fixed properties |
| --- | --- | --- |
| Learner opens the invitation dialog | `invite_opened` | `source` |
| Learner explicitly selects a template (not the automatic default) | `invite_template_selected` | `source`, `template`: `template_1`–`template_4` |
| Clipboard write resolves successfully | `invite_copy_succeeded` | `source`, `method`: `clipboard` |
| Learner activates a social link, or system sharing resolves | `invite_share_handoff` | `source`, `method`: `whatsapp`, `telegram`, `system_share` |

Sources are only `dashboard` and `account`. Social-link events record activation,
not whether the destination loaded. A resolved system share is a handoff only.
Clipboard failures/manual copying, unavailable system sharing, cancellation and
errors do not count as successful copy or system-share handoff.

These are interaction counts, not unique learners, delivered messages,
recipient visits, paid subscriptions or conversion attribution. Never send
drafts, contacts, recipients, email, learner IDs, page/session URLs or other
free-form content. The wrapper rebuilds payloads from fixed categories rather
than forwarding caller objects.

The changes must be merged before they can reach the main app. Events only
appear on a published website with platform analytics enabled and a visitor who
has explicitly opted in; development normally has no injected tracker.

Useful questions once data is available:
- Which invitation entry point is opened more often?
- Which fixed templates are selected most often?
- How often do opted-in visitors copy invitations versus activate social links?

Run the focused checks with:

```sh
node --test artifacts/ethio-hudhud/tests/invite-analytics.test.mjs
```
