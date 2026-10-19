# Website install analytics

These events use only Replit's injected website tracker. They do not install a
tracker or apply to the native Expo app. Analytics must be enabled in Publishing
settings and the website published for collection. Development without the
tracker is a safe no-op. No events are buffered or replayed.

## Visitor privacy control

Visitors (including signed-out visitors) can switch **Optional usage analytics**
off on `/privacy` or in Account Settings. Arabic and English labels are available.
The control applies immediately, independently of saving a learning profile.
The preference is browser-local, not tied to a learner account, and survives
reloads. Clearing site storage resets it to allowed, unless browser/tracker
opt-outs still apply. It does not synchronize across devices.

`public/analytics-privacy.js` is a synchronous privacy bootstrap in the HTML head,
not a tracker. It sets Umami's supported `localStorage['umami.disabled']` flag
before deferred scripts initialize. Umami checks this flag for automatic
pageviews (including route changes) as well as custom sends. The shared
`src/lib/analytics.ts` wrapper checks the same effective preference. There are no
manual pageview sends, script injections, tracker IDs, or event queues.
Re-enabling reloads the page so a tracker skipped at startup can initialize
normally; it never replays past interactions. Disabling cannot cancel a request
already in flight or delete previously collected data.

Do Not Track (including legacy variants), Global Privacy Control, and pre-existing
nonempty tracker opt-outs take precedence. The control explains these blocks and
cannot override them. The bootstrap only removes its own `hudhud:privacy` tracker
flag, never an external opt-out value. Storage events synchronize open tabs;
focus/pageshow recheck browser signals. Blocked storage or failed writes fail
closed for custom events and display an explicit error. A best-effort tracker
flag blocks automatic sends when preference writes fail; if all storage access
is blocked, the tracker itself cannot read its opt-out flag either. Browser
restrictions/blockers remain outside application control.

This switch covers optional browser-tracker analytics only. It does not disable
hosting access logs, Replit's default IP-based traffic metrics, sign-in,
learning progress, or necessary content-free service usage counters.
We send no learner identifiers, emails, chat text, or free-form event properties,
and do not call `umami.identify`. No analytics event records the privacy choice.

### Supported controls and verification

Checked Replit's [Project Analytics documentation](https://docs.replit.com/features/publishing/project-analytics):
Replit owns script injection; it documents no app-level consent API.
Use the existing Umami opt-out, not an invented Replit consent method or a second
tracker. Umami's [tracker source](https://github.com/umami-software/umami/blob/v2.19.0/src/tracker/index.js)
checks `umami.disabled` at startup and before sending.
Its [configuration documentation](https://docs.umami.is/docs/tracker-configuration)
also documents DNT and before-send hooks, but this app does not modify the
platform-injected script's configuration.

Local regression checks:

```sh
node --test artifacts/ethio-hudhud/tests/*.test.mjs
pnpm --filter @workspace/ethio-hudhud typecheck
```

Development has no injected tracker. After these changes are merged and released,
verify the platform's current injected tracker in browser Network tools: off
must suppress the initial pageview on reload, route pageviews, and install events;
on may resume only when DNT/GPC and external tracker opt-outs are absent.
Check a second tab, a returning off visitor, and a fresh private browser session.
Local tests exercise the privacy/bootstrap contract; they cannot prove a future
platform tracker version's behavior.

| Description | Event name |
| --- | --- |
| Website install prompt becomes visible | `install_prompt_shown` |
| Visitor closes the website prompt, including “Not now” | `install_prompt_dismissed` |
| Browser install request resolves | `install_browser_response` |
| Manual installation instructions become visible | `install_instructions_shown` |
| Browser emits the actual `appinstalled` event | `install_completed` |

All events have `platform` (`ios` or `android`) and `in_app_browser` (boolean).
Browser responses also have `outcome` (`accepted` or `dismissed`).
Instructions have `instruction_type` (`external_browser`, `ios_share_menu`, or
`android_browser_menu`). Completion has `source: appinstalled`.
These are fixed categories, not learner IDs, URLs, chat text, or other free-form
user data. Nothing sets a tracker identity.

The wrapper honors Do Not Track, Global Privacy Control, and the tracker’s
`umami.disabled` local-storage opt-out. If privacy checks or tracking fail,
installation still works. The Privacy and Account Settings control gates both
this shared wrapper and the injected tracker's automatic pageviews.

## Interpretation

- Browser acceptance is **not** completed installation. Do not add the two
  counts together.
- Closing the prompt after acceptance or installation does not emit a dismissal.
- Instructions count once per instruction type per visible prompt, not per
  rerender. Showing instructions does not indicate that the visitor followed them.
- Only `appinstalled` confirms completion. Entering standalone mode, returning
  to the site, or already running the installed app does not emit completion.
- There is no invented iOS completion event. Browsers without `appinstalled`
  cannot provide a measured completion rate. Missing events are not proof that
  installation failed.
- Event counts are interactions, not unique learners. The prompt is mobile-only,
  so its counts are not a denominator for all website visitors. Privacy choices,
  blockers, missing tracker, browser support, and the seven-day dismissal
  cooldown all limit observed counts.

Useful questions after collection starts:
- How often do Android prompt views lead to accepted browser requests?
- How many confirmed `appinstalled` events did we observe separately from accepts?
- How often do iOS visitors see instructions versus dismissing the prompt?
