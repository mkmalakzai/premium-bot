# AFGLION — Telegram Mini App

A mobile-first HTML/CSS/JavaScript Telegram Mini App deployed on Vercel with a Firebase Cloud Firestore backend. The visual public Firebase config references the existing **afglion-47b07** project, but **all accounts and AFN balances are accessed through authenticated Vercel functions using Firebase Admin SDK**. The public Firebase web config alone does **not** activate the backend.

## Final update — exact shared logo, instant VIP and channel payment updates (2026-10-09)

- **Exact user-approved logo:** The existing `afglion-logo.svg` now embeds a WebP rendition derived directly from the user's approved crowned-lion image, rather than a different vector lion. It is intentionally resized for efficient Mini App use; the user's original 1254×1254 PNG remains the higher-resolution source for BotFather and Telegram channel profile images. `afglion-brand.svg` embeds the *same* image content.
- **VIP purchases are immediate:** Purchases take the amount directly from the verified Firestore wallet in a transaction and activate the selected package instantly. There is no admin VIP approval queue for new purchases. An already-active VIP cannot be overwritten by a second purchase. Referrer commission (when eligible) is granted in the same transaction. Prior unprocessed VIP request documents remain historical; they are no longer actionable from Admin.
- **Editable deposit admin contact:** Admin → Settings → Deposit & withdrawals → Deposit admin Telegram username. The user-facing Deposit screen opens that Telegram contact, including after it is changed. Keep the handle public and valid.
- **Premium Telegram channel notices:** Admin → Settings → Channel payment notifications: enable automatic messages and enter a public channel link. The backend queues one notice when a manual deposit or withdrawal is **approved** (never when merely requested or rejected), then attempts a premium HTML-formatted Telegram bot post. Notices include the approved AFN amount and *masked* user identifier; they omit payment reference, phone number and wallet details.
- **Delivery recovery:** If the Telegram API fails after a financial approval, the financial transaction stays approved and the failed notice appears under Admin → ☰ → Channel notifications with a Retry action. The bot must be an administrator with permission to post in the channel.
- **Operator caution:** VIP payouts like 500 AFN paid for 50 AFN/day for 30 days imply a highly risky, potentially unsustainable return; do not present them as guaranteed earnings.

## Fix: Separate payouts / Start welcome / Channel notifications (October 2026)

- **Deposit reference vs withdrawal receiving account:** Deposit collects a transfer reference/sender details; withdrawal instead collects the recipient's phone/account where they want to receive money. Admin payment-review pages identify these fields separately. Server stores `paymentReference` only for deposits and `payoutRecipient` only for withdrawals, with `details` retained for backward compatibility.
- **Automatic approved-payment posts:** Admin → ☰ → Settings → *Channel payment notifications*. Set the correct public Telegram channel link, enable **Announce approved deposits and withdrawals**, and **Save all settings**. Default for new setups is `https://t.me/AFGlionpayouts`, but previous database settings take precedence. The bot **must be admin of that exact target channel** with rights to post messages. Clicking **Send test message to channel** (or Admin → Channel notifications → Send test notification) sends a real diagnostic announcement and returns Telegram's error, if any. Only newly approved payments after notifications are enabled are posted; earlier approvals are not backfilled automatically. Failed queued posts can be retried from the Channel notifications page. Posts mask the member ID and do not leak references, payout accounts or contact information.
- **/start welcome bot:** A protected Vercel Telegram webhook `/api/telegram` handles private-message `/start`. It sends a warm Pashto/English welcome with an inline **🚀 Start Now • Open App** web-app button and **📢 AFGLION Payouts Channel** link to `https://t.me/AFGlionpayouts`. The webhook checks Telegram's `X-Telegram-Bot-Api-Secret-Token` header against an HMAC-like secret derived from `TELEGRAM_BOT_TOKEN`. It ignores non-start and non-private messages.
- **One-time webhook setup:** In **Admin → Settings → Bot /start welcome message**, only the **owner** can press **Activate /start welcome bot**. This calls Telegram `setWebhook` server-side and replaces any existing webhook configured for **@Afglionbot**. Do not activate if the same bot runs another system whose webhook must be preserved. The **Check welcome webhook** button displays the actual Telegram webhook registration and errors; test by closing the bot chat and sending `/start` directly.
- **Browser testing:** Vercel deployment READY only confirms a successful build. Use a real Telegram login to test `/start`, manual approvals, channel posting and permission controls.

## Final AFGLION identity and startup (October 9, 2026)

- **One consistent official lion logo:** `afglion-logo.svg` (standalone app icon) and self-contained `afglion-brand.svg` (the exact same lion crest alongside AFGLION Members Club text). Both vector assets are hosted publicly in this project and may be reused for social media, cards, website or promotion.
- **Animated launch screen:** a high-contrast black-and-gold, lion-branded loading overlay with animated orbit rings, glow, gold progress indicator, context-sensitive status and a smooth exit. It waits at least ~1.5 s before disappearing and has a 14-second fail-safe so it never indefinitely blocks access. Respects reduced-motion preferences.
- **Shared brand:** The same lion crest appears in the header, join screen, admin header, footer, website favicon, social metadata and splash/loading screen.
- **Reusable general branding:** The owner/admin can open **Admin → ☰ → Official brand kit**, preview the brand and export the main wordmark as a 1720×480 PNG or the application crest as a 1024×1024 PNG; the original vectors remain accessible at `/afglion-brand.svg` and `/afglion-logo.svg`.
- **No backend changes:** Telegram authentication, subscriptions, Firebase, member balances and existing database records remain unchanged by this design update.

## October 9, 2026 — UI & admin improvements

- **Languages:** Vanilla HTML, CSS and JavaScript for the Telegram Mini App; Node.js CommonJS Vercel API; Cloud Firestore with Firebase Admin SDK.
- **Main tabs:** Home → VIP → Referral → Profile. The account/profile theme switch can toggle a designed dark or light palette. Theme is remembered per browser/device.
- **Mobile polish:** Avatar has a stable circular crop. VIP IDs such as `vip_randomid` no longer stretch the wallet or stats cards; cards use the friendly VIP package name, and long text truncates safely.
- **Redesigned Admin:** Three-line hamburger navigation opens an accessible left drawer with Dashboard, Members, Transactions, Payment methods, VIP approvals, VIP packages, Settings, and Staff & owners (owner-only). Settings are grouped into expandable sections.
- **Payment methods:** Admin → Payment methods can add, edit, show/hide and delete up to 12 methods. Each has a name, payment recipient number and enabled status. The deposit form uses the chosen method's number, a Copy button, and sends users to a configurable Telegram contact for screenshots. Server verifies the payment method against live settings. Manual withdrawals also select a supported method.
- **Permissions:** Numeric Telegram IDs in `ADMIN_TELEGRAM_IDS` are permanent root owners. Owners can promote an existing Telegram member to `admin` or `owner`, or demote them. Regular admins can manage ordinary users but cannot modify staff-role privileges or ban or adjust other administrators. New owner appointments are protected by a server-side owner check; no UI query parameter can grant access.
- **Balances:** Admin → Members → Manage supports adding OR deducting an AFN amount. The server validates signed whole amounts, rejects overdrafts and writes an audit event and member activity.
- **Finance:** Approved deposits, withdrawals, VIP purchases and balances remain protected by Firestore transactions. Do not use as a regulated bank or promise scheduled VIP returns as guaranteed profits.
- **Note on environment:** Telegram bot token and service-account JSON remain sensitive Production-only Vercel environment variables and are never included in the client bundle.

## October 2026 update — channel gate, flexible VIP, deposit instructions

- **Force Join:** default public channel `https://t.me/geminipromtshub`, changeable from Admin → Settings. The bot **@Afglionbot must be added as administrator to this Telegram channel**, otherwise the official `getChatMember` API is not guaranteed to verify membership. The backend verifies membership before returning a Telegram API session and again for every protected request, and fails closed if it cannot confirm membership. Administrator IDs are exempt so channel misconfiguration cannot lock out the owner. Test force-join with a separate non-admin Telegram account.
- **Home:** the daily free reward is **disabled by default** (no free earning reward on Home). Admin → Settings can enable it and control the amount. The Home page shows a configurable Telegram-channel button.
- **VIP packages:** Admin → Packages creates, edits, hides and deletes custom named packages with arbitrary price, daily reward and duration (up to 20). Existing active subscriptions preserve their original approved terms; deleted packages are no longer offered. Pending purchase requests capture the package terms when submitted.
- **Manual deposits:** Admin → Settings supplies the receiving **payment number** (no real number is hardcoded), the clickable screenshot recipient (default `@Mk_Malakzai`), and instructions. Customers copy the number, send payment, open the admin chat and submit a deposit request. Until the admin enters a receiving number, deposits are not accepted. The app does **not** transfer money or upload screenshots automatically.
- **Avatar:** header photo is a single fixed-size, circular cropped image with an initial-letter fallback if the Telegram photo fails to load.
- **Important:** this uses Telegram's real membership-check API. A link click alone does not unlock the app; an actual verified membership is required.

## Features

- **Home:** AFN balance, announcements, official-channel button and optional free check-in (off by default).
- **Referral:** Telegram `startapp=ref_<id>` invitations. Account association is signed and applied one time on onboarding; 10% default commission on an **approved paid VIP purchase** (not on signup), configurable by admin.
- **VIP:** Fully custom admin-managed packages with configurable price, per-day claim amount and plan length. Defaults: Gold **500 AFN**, **50 AFN** per eligible day for **30 days**; Elite 1,000 AFN, 110 AFN per eligible day for 30 days. The admin approves requests and deducts the price from already-confirmed available wallet funds. Each plan snapshots its approved terms. Each daily reward requires a claim, starting after 24 hours. Missed days do not accumulate.
- **Wallet:** Manual deposit request (amount, method, reference) and manual withdrawal request (amount, method, recipient details), with request history. Deposits do not credit the wallet before approval. Withdrawals reserve the amount instantly and return it on rejection or user cancellation. Requests can be processed only once.
- **Profile:** Telegram identity, edit display name, member status and earnings history.
- **Admin:** Verified Telegram ID allowlist, member access, settings, prices, durations, referral %, free daily bonus, deposit/payout instructions, minimum amounts, and independent approve/reject queues for VIP/deposit/withdrawal.
- **Browser preview:** Public website shows design only; real data requires a Telegram Web App signed session and server credentials.

## Connect the AFGLION Firebase project securely

1. Open the existing Firebase project **afglion-47b07**. Enable **Cloud Firestore** if it is not enabled already.
2. In Firebase Project Settings → **Service accounts**, generate a service-account private key **for afglion-47b07**. **Never put its private key in GitHub, JavaScript, Telegram chat or a public screenshot.**
3. In Vercel → Project `velora-members-club` → Settings → Environment Variables, set:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete private service-account JSON, stored as encrypted/sensitive (Production).
   - `TELEGRAM_BOT_TOKEN`: the secret token for **@Afglionbot**, stored encrypted/sensitive (Production).
   - `ADMIN_TELEGRAM_IDS`: your numerical Telegram user ID (multiple IDs separated by commas). This is **not** a username.
4. Redeploy **Production** after setting the variables. `/api/index?action=health` should then report `backendConfigured:true`. This checks presence of configuration, not Firestore connectivity; sign in via Telegram to test actual operations.
5. Open **@BotFather** and configure **@Afglionbot** Main Mini App / menu URL as `https://velora-members-club.vercel.app`. Open the app from inside Telegram. Set the username in Admin → Settings to `Afglionbot` (the default is already provided).
6. Test with a second Telegram account: sign up → manual deposit → admin approves → VIP request → admin approves → 24-hour claim → referral bonus → withdrawal → admin review. Test rejection and cancellation too.

The frontend file `firebase-config.js` contains the public Web SDK config supplied by the project owner. It **does not include Firebase credentials** and is not used to authorize database writes.

## Existing Firebase project warning

**Do not replace the existing Firestore rules with this repository's example `firestore.rules`** without auditing them first: the existing AFGLION project may host another app, and replacing its rules could break that app. The new application uses namespaced collections (`veloraUsers`, `veloraSettings`, `veloraVipRequests`, `veloraMoneyRequests`, `veloraReferralEvents`, `veloraReferralAwards`) so it does not share member documents with earlier apps. Existing wildcard `allow read, write: if true` rules can still expose those collections; fix such rules or use a separate Firebase project. Firestore Admin SDK bypasses client security rules, so server-side validation and credentials are critical.

## Financial and operational cautions

- The example **500 AFN purchase / 50 AFN daily / 30 days** advertises **1,500 AFN** in scheduled rewards against a **500 AFN** purchase. It is a very high implied return, may be financially unsustainable, and must not be advertised as guaranteed profit. A 10% referral commission increases the operator's liabilities. Obtain appropriate local legal/financial advice before soliciting deposits or launching to real users.
- Admin approval is a recordkeeping action; **the program cannot verify external payments or automatically transfer money**. Inspect and match the real-world receipt before approving deposits and pay withdrawals through your external agreed method.
- AFN fields use integers. Do not treat manually editable balances as a banking ledger or audited payment system.
- Telegram `initData` is verified cryptographically on the server, each API session is HMAC-signed, and admin permissions are checked server-side.
- Referral signup association, VIP purchase/commission, daily claims, manual deposits and withdrawal reservation/release use Firestore transactions to avoid duplicate processing.
- The Admin overview lists the newest 500 users, with sampled VIP/balance statistics. Use aggregates/pagination for growth.
- For regulatory, security and accounting purposes, perform a professional review before a real-money launch.

## Development

```sh
npm install
npm run check
vercel dev
```

Live app: https://velora-members-club.vercel.app
Repository: https://github.com/mkmalakzai/premium-bot
