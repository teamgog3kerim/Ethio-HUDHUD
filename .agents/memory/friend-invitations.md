---
name: Friend invitations
description: User-requested learner invitations and public-link sharing constraints.
---

Learners can invite friends through social media to discover Ethio HUDHUD, choose
a plan and learn Amharic together. Invitations include the public app domain and
selectable Arabic messages, including the user's four supplied examples.

**Why:** The user explicitly requested an “invite friend” button with sample
Arabic invitation messages and the app domain attached.

**How to apply:** Sharing is learner-initiated and recipient-confirmed, never
automatic messaging or contact collection. Do not claim a message was delivered
from opening a share sheet. Keep preview addresses, identity details and session
tokens out of invitations. If the public domain changes, obtain the verified URL
from deployment metadata and update invitation links for both web and mobile.

Invitation measurement requires explicit analytics opt-in, not just the site's
default pageview permission. Keep this measurement website-only and categorical;
copying or handing off to a sharing app does not establish delivery or purchase.

**Why:** The user requested opt-in invitation analytics without message,
recipient, learner or session data, and without silently adding native analytics.

**How to apply:** Preserve the stricter invitation consent requirement when
changing site-wide analytics defaults. Never infer deliveries or subscriptions
from invitation interaction counts.

Consent controls must distinguish default pageview permission from explicit
invitation opt-in, disclose invitation measurement, and let a first-time visitor
opt in directly.

**Why:** A default-enabled pageview setting is neither informed invitation consent
nor a usable invitation opt-in when its control already appears checked.

**How to apply:** Check the no-saved-preference state and both disclosure languages
whenever consent controls change; do not test only pre-populated preferences.
