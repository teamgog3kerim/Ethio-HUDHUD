# Website install analytics

These events use only Replit's injected website tracker. They do not install a
tracker or apply to the native Expo app. Analytics must be enabled in Publishing
settings and the website published for collection. Development without the
tracker is a safe no-op. No events are buffered or replayed.

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
installation still works. No local consent UI currently exists; future consent
controls must gate this shared wrapper as well as the injected tracker.

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
