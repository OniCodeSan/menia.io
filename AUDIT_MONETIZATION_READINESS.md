---
title: Tokaro Monetization & Creator Upsell — Technical Readiness Audit
date: 2026-04-18
status: AUDIT ONLY — no implementation
---

# Executive Summary

Tokaro has a functional token economy, wallet system, content gating, subscriptions, and admin tooling. However, it has **zero concept of creator plans** (free/start/grow/pro). The entire platform currently operates as a single-tier creator model where all creators have the same capabilities. There is no database column, no service logic, and no UI gating that differentiates a free creator from a paid one. This is the single largest structural gap.

Secondary gaps: the DM system has no paid-message monetization, the earnings ledger does not track platform spread, creator earnings from subscriptions are not credited automatically, and the admin console cannot assign creator plans or toggle feature access.

**Overall readiness: 38/100** — strong foundation, but the plan system must be built from scratch.

---

# A. Current Repo Assessment

| Area | Stack | Notes |
|------|-------|-------|
| Framework | React 18 + Vite (SPA) | Deployed to Hetzner static nginx |
| Auth | Supabase Auth + custom `auth.js` wrapper | Roles: fan/creator/admin in `profiles.role` |
| DB | Supabase Postgres with RLS | 15+ tables, stored procedures for wallet ops |
| Server | Express on port 3001 (`server/index.js`) | 3 endpoints: admin/topup, send-welcome, payout-action |
| Payments | Token-only (Stripe fully removed) | Admin manual topup, no payment provider |
| Messaging | Supabase `direct_messages` table + Realtime | Rewritten from mock; no paid-message logic |
| Creator tools | Dashboard with 10 tabs | Analytics, publish, wallet, KYC, subscriptions |
| Admin | AdminConsole with 7 tabs | Users, moderation, economy, payouts, engagement, live |
| i18n | 6 languages (IT, EN, FR, DE, ES, RU) | Comprehensive coverage |

---

# B. What Already Exists

## Database (supabase/)
| Feature | Table/Function | File |
|---------|---------------|------|
| User profiles with role | `profiles` (role: fan/creator/admin) | `schema.sql` |
| Token wallets | `token_wallets` (user + creator types) | `schema.sql` |
| Transaction ledger | `token_transactions` (topup/spend/earn/refund/payout) | `schema.sql` |
| Wallet spend (RPC) | `wallet_spend()` with 100K limit | `wallet_security.sql`, `security_critical_fixes.sql` |
| Wallet topup (RPC) | `wallet_topup()` — server-only | `wallet_security.sql` |
| Payout requests | `payout_requests` + `wallet_request_payout()` | `wallet_security.sql`, `payout_management.sql` |
| Payout refunds | `wallet_refund_payout()` | `payout_management.sql` |
| Creator credit | `wallet_credit_creator()` | `live_functions.sql` |
| Subscriptions | `subscriptions` (fan→creator, base/premium tier) | `subscriptions.sql` |
| Content posts | `posts` (access: public/subscribers/premium) | `posts.sql` |
| Content gating RLS | `posts_select_gated` with expiry check | `security_critical_fixes.sql` |
| Direct messages | `direct_messages` + Realtime | `direct_messages.sql` |
| Live sessions | `live_sessions` + `live_chat_messages` | `live_tables.sql` |
| Live donations | `increment_live_donations()` | `live_functions.sql` |
| Social interactions | `post_likes`, `post_comments`, `reshares` | `interactions.sql`, `notifications_reshares.sql` |
| Moderation | `user_reports`, user status (active/warned/suspended/banned) | `moderation.sql` |
| KYC fields | `payout_method` jsonb on profiles | `payout_management.sql` |
| Creator profile fields | category, tags, monthly_price, yearly_price | `profiles_creator_fields.sql` |
| Admin function | `is_admin()` | `admin.sql` |

## Server API (server/)
| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/topup` | Credit tokens to user (ADMIN_SECRET header) |
| `POST /api/send-welcome` | Send welcome email after registration |
| `POST /api/payout-action` | Approve/reject/pay payout requests |
| `GET /api/health` | Health check |

## Frontend — Services (src/lib/)
| Module | Key methods |
|--------|-------------|
| `wallet.js` | getUserWallet, getCreatorWallet, spend, topUp (blocked), hasLiveAccess, purchaseLiveAccess, requestPayout, listPayouts, listTransactions |
| `auth.js` | register, login, logout, me, updateMe, onAuthChange; safeCall wrapper for structural errors |
| `storage.js` | upload, getSignedUrl, getSignedUrls, deleteFile (media + avatars buckets) |
| `adminMetrics.js` | 12+ metric functions covering users, tokens, payouts, engagement, creators, fans |
| `moderation.js` | submitReport, fetchReports, updateReportStatus, updateUserStatus |

## Frontend — Pages
| Page | Role gate | Purpose |
|------|-----------|---------|
| Dashboard | creator/admin | Creator dashboard (10 tabs) |
| AdminConsole | admin | Platform administration (7 tabs) |
| FanDashboard | fan | Subscriptions, wallet, activity |
| GoLive | none (nav button gated) | Start live stream |
| CreatorProfile | public | View creator, subscribe, donate |
| ContentPage | public (gated by RLS) | View individual post |
| Checkout | any | Subscribe or unlock content |
| Messages | authenticated | DM conversations |

## Frontend — Payment components (src/components/payments/)
| Component | Purpose |
|-----------|---------|
| SubscriptionModal | Subscribe to creator (base/pro tiers, wallet deduction, DB insert) |
| DonationModal | Send token donation to creator |
| LiveAccessButton | Pay-per-view live access (30 tokens default) |

---

# C. What Is Missing

## C1. Database — MISSING

| Item | Status | Detail |
|------|--------|--------|
| **`creator_plans` table or `profiles.plan` column** | MISSING | No concept of free/start/grow/pro anywhere in the DB. The `profiles` table has `role` (fan/creator/admin) but no plan field. |
| **Plan feature matrix table** | MISSING | No `plan_features` or config that maps plan → allowed capabilities |
| **Paid message cost field** | MISSING | `direct_messages` has no `cost` or `token_amount` column. No record of what was charged. |
| **Paid message payment record** | MISSING | No ref_id convention for DM spending in `token_transactions` |
| **Content unlock records** | MISSING | No table to track which fan unlocked which specific paid post. `token_transactions.ref_id` could be used but no `content_unlocks` table exists. |
| **Creator earnings from subscriptions** | MISSING | When a fan subscribes via SubscriptionModal, tokens are spent from fan wallet but **never credited to creator wallet**. Only live donations credit creators. |
| **Platform spread/commission tracking** | MISSING | No column or transaction type for platform fee. Current code credits 100% to creator on donations. |
| **Subscription renewal/recurring logic** | MISSING | Subscriptions have `expires_at` but no cron/job to handle expiry or auto-renewal |

## C2. Backend/Services — MISSING

| Item | Status | Detail |
|------|--------|--------|
| **Plan assignment API** | MISSING | No endpoint to set a creator's plan. Would need `POST /api/admin/set-plan` or similar. |
| **Plan enforcement middleware** | MISSING | No server-side check that a creator's plan allows a given action. |
| **Subscription credit-to-creator** | MISSING | Server or DB trigger needed: when fan subscribes, portion of tokens must flow to creator wallet. |
| **Platform commission deduction** | MISSING | The 10% spread referenced in i18n/FAQ is never applied in code. `wallet_credit_creator` credits full amount. |
| **Paid DM endpoint or RPC** | MISSING | No stored procedure or API for "spend 1 token to send DM". |
| **Subscription expiry cron** | MISSING | No background job to mark expired subscriptions as `status = 'expired'`. |
| **Payment provider integration point** | PARTIAL | Schema comments reference Stripe webhooks. topUp() is blocked client-side but the server topup endpoint exists. Architecture supports future provider. |

## C3. UI/Dashboard — MISSING

| Item | Status | Detail |
|------|--------|--------|
| **Creator plan selection UI** | MISSING | No page/modal where a creator can see/choose their plan tier. |
| **Plan upgrade/downgrade flow** | MISSING | No UI for plan changes. |
| **Plan badge on creator profile** | MISSING | Creator profiles don't show their plan level. |
| **Feature-locked UI states** | MISSING | "Go Live" button shows for ALL creators. Publish premium content available to ALL. No "upgrade to unlock" prompts. |
| **Paid DM UI** | MISSING | ChatWindow.jsx has no token-charging UI. PaidMessageBanner.jsx exists but is unused (hardcoded €4.99, no wallet integration). |
| **Content unlock tracking** | MISSING | ContentPage shows gated content but doesn't record individual unlocks separately from subscriptions. |
| **Creator plan in admin console** | MISSING | Admin can't view or change a creator's plan. |
| **Earnings breakdown (sub vs donation vs unlock)** | PARTIAL | Admin economy tab shows aggregate spending. Creator wallet shows transactions but no categorized breakdown. |

## C4. Admin/Testing Tools — MISSING

| Item | Status | Detail |
|------|--------|--------|
| **Assign creator plan** | MISSING | No admin action to set plan. |
| **View creator plan** | MISSING | User list in admin doesn't show plan column. |
| **Toggle feature access** | MISSING | No per-creator feature flags. |
| **Inspect creator earnings by source** | PARTIAL | Token transactions exist but no categorized view (donations vs subscriptions vs unlocks). |
| **Test mode / sandbox tokens** | MISSING | No way to grant test tokens without hitting production wallet. |

## C5. Permissions/Gating — MISSING

| Item | Status | Detail |
|------|--------|--------|
| **Plan-based route guards** | MISSING | AuthGuard checks role only, not plan. |
| **Plan-based feature checks** | MISSING | No `canGoLive()`, `canMonetize()`, `canSendPaidMessages()` functions. |
| **RLS plan enforcement** | MISSING | No RLS policy checks plan level. Any creator can insert premium posts. |
| **Server-side plan validation** | MISSING | Server endpoints don't check creator plan. |

## C6. Token Economy — PARTIAL

| Item | Status | Detail |
|------|--------|--------|
| **Fan wallet + spend** | DONE | wallet_spend() RPC, max 100K, balance check |
| **Creator wallet + earn** | PARTIAL | Only live donations credit creators. Subscriptions and content unlocks do NOT credit. |
| **Admin topup** | DONE | POST /api/admin/topup with ADMIN_SECRET |
| **Payout requests** | DONE | wallet_request_payout() with min 625 tokens, admin approval flow |
| **Platform commission** | MISSING | 10% spread referenced in terms but never deducted in code |
| **Transaction audit trail** | DONE | token_transactions table with types: topup/spend/earn/refund/payout |

## C7. Earnings Ledger — PARTIAL

| Item | Status | Detail |
|------|--------|--------|
| **Creator balance tracking** | DONE | token_wallets with wallet_type='creator' |
| **Earnings from live donations** | DONE | wallet_credit_creator() on live donation |
| **Earnings from subscriptions** | MISSING | SubscriptionModal spends from fan but never credits creator |
| **Earnings from content unlocks** | MISSING | Not implemented |
| **Earnings from paid DMs** | MISSING | Not implemented |
| **Platform fee column** | MISSING | No way to track what the platform kept |

## C8. Messaging Monetization — MISSING

| Item | Status | Detail |
|------|--------|--------|
| **Cost-per-message field** | MISSING | direct_messages has no cost column |
| **Wallet deduction on DM send** | MISSING | ChatWindow.jsx calls supabase.insert() directly, no wallet.spend() |
| **Creator receives DM earnings** | MISSING | No credit flow |
| **PaidMessageBanner** | EXISTS BUT UNUSED | Component exists at `src/components/messages/PaidMessageBanner.jsx` with hardcoded €4.99, not integrated |
| **Creator sets DM price** | MISSING | No setting for per-message or per-conversation pricing |

## C9. Premium Content Unlocks — PARTIAL

| Item | Status | Detail |
|------|--------|--------|
| **Content access levels** | DONE | posts.access = public/subscribers/premium |
| **Subscription-based gating** | DONE | RLS policy checks active subscription |
| **Per-content token unlock** | MISSING | posts.price column exists but no unlock flow. ContentPage doesn't offer "unlock for X tokens". |
| **Unlock record table** | MISSING | No `content_unlocks` table to track individual purchases |
| **Creator receives unlock earnings** | MISSING | No credit-to-creator on content unlock |

## C10. Live Feature Preparation — PARTIAL

| Item | Status | Detail |
|------|--------|--------|
| **Live session creation** | DONE | GoLive.jsx creates live_sessions row |
| **Live chat + donations** | DONE | LiveChat, DonationPanel, DonationAlert |
| **Live access gating** | DONE | LiveAccessButton + wallet.purchaseLiveAccess() |
| **Plan check before Go Live** | MISSING | Any creator can go live. No plan check. |
| **Live viewer count tracking** | PARTIAL | Column exists, no real tracking (manually set) |
| **Live recording/VOD** | MISSING | No recording, no post-live replay |

---

# D. Risks / Technical Debt

## D1. Critical Risks

| Risk | Severity | Detail |
|------|----------|--------|
| **Subscription spend never credits creator** | HIGH | Fan pays tokens via SubscriptionModal → wallet_spend(). But no wallet_credit_creator() is called. Creator earns nothing from subscriptions. This is a **revenue logic bug**. Files: `SubscriptionModal.jsx:68-92`, `Checkout.jsx:72-99`. |
| **No platform commission anywhere** | HIGH | Terms say 10% fee. Code credits 100% to creator on donations. Zero deduction implemented. `live_functions.sql:35` credits full p_amount. |
| **Payout rate inconsistency** | MEDIUM | `security_critical_fixes.sql:143` uses 0.08 EUR/token. `CreatorWallet.jsx:9` displays 0.10 EUR/token. User sees wrong rate. |
| **No subscription expiry handler** | MEDIUM | `subscriptions.expires_at` is set but nothing marks them `expired`. RLS checks `expires_at > now()` so access IS correctly gated, but stale rows accumulate and creator stats are wrong. |
| **wallet_spend caller identity** | MEDIUM | `wallet_spend()` uses `auth.uid()` to identify the spender. But the function is called by fans spending tokens. If someone calls it directly, they spend their OWN tokens. This is correct but means the server cannot spend on behalf of a user without service_role. |

## D2. Weak Points

| Issue | Detail |
|-------|--------|
| **No idempotency on subscription creation** | SubscriptionModal checks for existing active sub, updates if found. But race condition possible if two tabs subscribe simultaneously — partial index `WHERE status='active'` could fail on concurrent inserts. |
| **PaidMessageBanner is dead code** | Component exists but was never integrated. Still shows "€4.99" (euro, not tokens). |
| **Mock data remnants** | `src/lib/mockData.js` still exists and is imported by CreatorProfile.jsx, Checkout.jsx, Explore.jsx as fallback. |
| **GoLive has no auth guard** | Route `/go-live` in App.jsx has no AuthGuard wrapper. Navbar hides the button for fans but URL is directly accessible. |
| **Local wallet fallback** | `wallet.js` has full localStorage implementation. In dev without Supabase, actions succeed silently without real validation. |

## D3. Future Scaling Concerns

| Issue | Detail |
|-------|--------|
| **ConversationList N+1 queries** | Loads all partner profiles, then queries last message per partner in a loop. Will degrade with many conversations. |
| **No pagination on transactions** | `listTransactions()` returns last 100. No cursor pagination for heavy users. |
| **No caching layer** | Every page load re-fetches wallet, profile, transactions from Supabase. |
| **Single admin secret** | Server uses one ADMIN_SECRET for all admin actions. No per-admin authentication. |

---

# E. Recommended Build Order

## Phase 1 — Creator Plans Foundation (critical path)
1. Add `plan` column to `profiles` (enum: free/start/grow/pro, default: 'free')
2. Create plan feature matrix (constant or config table) mapping plan → capabilities
3. Create `setPlan()` admin RPC or API endpoint
4. Create `getCreatorCapabilities(plan)` utility function (shared between frontend/backend)
5. Add plan display to admin console user list
6. Add plan assignment action in admin console

## Phase 2 — Monetization Enforcement
7. Fix subscription credit: when fan subscribes, credit creator wallet (minus platform %)
8. Implement platform commission (10% deduction on all token flows to creators)
9. Add plan checks to GoLive (block free/start), premium publish (block free), paid DMs (block free)
10. Create paid DM flow: wallet.spend(1 token) before insert into direct_messages
11. Add per-content unlock flow: wallet.spend(post.price) → record in content_unlocks → credit creator
12. Update RLS: prevent free-plan creators from inserting premium posts

## Phase 3 — UI & Polish
13. Creator plan selection/upgrade UI on dashboard
14. Feature-locked states in UI (greyed out with "upgrade to unlock" prompts)
15. Earnings breakdown by source (subscriptions, donations, unlocks, DMs) in creator wallet
16. Subscription expiry cron job or edge function
17. Plan badge on creator profiles
18. Fix payout rate display inconsistency (0.08 vs 0.10)
19. Remove mock data fallbacks from production code

---

# F. Readiness Scores

| Area | Score | Rationale |
|------|-------|-----------|
| **Creator plans** | 5/100 | No plan column, no feature matrix, no gating, no UI. Only the `role` concept exists. |
| **Wallet/token** | 75/100 | Solid wallet, spend, topup, payout. Missing: commission deduction, subscription credit to creator. |
| **Monetization** | 30/100 | Subscriptions and donations work for fans. Creators don't earn from subscriptions. No paid DMs. No content unlocks. No commission. |
| **Admin** | 55/100 | Good: user list, moderation, economy stats, payout approval, token topup. Missing: plan assignment, feature toggles, earnings inspection by source. |
| **Overall** | 38/100 | The token economy foundation is solid but the plan system (the core feature requested) doesn't exist at all. |

---

# G. Action Checklist

## Roles & Plans
- [x] DONE — Fan role exists
- [x] DONE — Creator role exists
- [x] DONE — Admin role exists
- [ ] MISSING — `profiles.plan` column (free/start/grow/pro)
- [ ] MISSING — Plan feature matrix definition
- [ ] MISSING — Plan assignment admin endpoint
- [ ] MISSING — Plan enforcement in RLS
- [ ] MISSING — Plan enforcement in frontend routing

## Free Creator Capabilities
- [x] DONE — Profile creation
- [x] DONE — Publish free content
- [ ] MISSING — Block monetization for free plan
- [ ] MISSING — Block go-live for free plan
- [ ] MISSING — Block paid DMs for free plan
- [ ] MISSING — Block advanced analytics for free plan

## Paid Creator Capabilities
- [ ] MISSING — START: premium content gating per plan
- [ ] MISSING — START: paid private messages
- [ ] MISSING — START: basic monetization unlocked by plan
- [ ] MISSING — GROW: live enabled per plan
- [ ] MISSING — GROW: enhanced analytics per plan
- [ ] MISSING — PRO: advanced analytics per plan
- [ ] MISSING — PRO: visibility/boost tools

## Token System
- [x] DONE — Wallet structure (user + creator types)
- [x] DONE — Token balance logic (spend/topup with stored procedures)
- [x] DONE — Transaction ledger (topup/spend/earn/refund/payout)
- [x] DONE — Manual admin crediting (POST /api/admin/topup)
- [x] PARTIAL — Future payment provider support (architecture ready, no integration)

## Paid Actions
- [ ] MISSING — Fan sends DM for 1 token
- [x] PARTIAL — Fan unlocks premium content (subscription-based access exists, per-content token unlock missing)
- [x] DONE — Live donation monetization
- [x] DONE — Live access pay-per-view

## Earnings Model
- [x] PARTIAL — Creator earnings tracking (live donations only)
- [ ] MISSING — Earnings from subscriptions credited to creator
- [ ] MISSING — Earnings from content unlocks credited to creator
- [ ] MISSING — Earnings from paid DMs credited to creator
- [ ] MISSING — Platform token spread/commission (10% deduction)

## Admin/Testing
- [ ] MISSING — Assign creator plan
- [x] DONE — Credit tokens (admin topup)
- [x] DONE — Inspect wallet ledger (admin economy tab)
- [x] PARTIAL — Inspect creator earnings (aggregate only, no per-source breakdown)
- [ ] MISSING — Toggle feature access per creator

## Enforcement
- [ ] MISSING — Plan restrictions enforced server-side
- [ ] MISSING — Plan restrictions visible in UI (locked states)
- [x] DONE — Transactional safety on token spending (wallet_spend RPC with balance check + row lock)
- [x] DONE — Spend limit (100K per transaction)
- [x] DONE — Payout minimum (625 tokens / €50)
- [ ] MISSING — Commission deduction on creator credit

## Data Integrity
- [x] DONE — RLS on all tables
- [x] DONE — Role escalation prevention (hardcoded fan on registration)
- [x] DONE — Wallet topup blocked from client (server-only)
- [x] DONE — No direct wallet balance modification (RLS blocks UPDATE)
- [ ] MISSING — Subscription expiry cleanup job
- [ ] BLOCKED — Payout rate inconsistency (0.08 in DB vs 0.10 in UI)
