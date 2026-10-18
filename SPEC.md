# YK Station 又鍇站 — Product Spec

A private couples app for exactly two people: **Yoyo 又又** and **Kyle 鍇鍇**.
Not on the App Store. Delivered as a **PWA** that each of them adds to the iPhone Home Screen.
Note the character: it is **鍇** (not 鎧) everywhere.

The design mockups in `design/` are the visual source of truth (see `design/README.md`).
All tunable game numbers live in one config file (`src/config/rules.ts`) so the couple can adjust them.

---

## 1. Constraints

- **Free.** No paid services, no credit card. Apple Developer Program is out of scope.
- **iPhone first.** iOS Home Screen web app (iOS 16.4+ for Web Push). Must also work in a desktop browser for development.
- **Two users only.** Everyone else is rejected at login.
- **Language.** Default 繁體中文 (`zh-Hant`); second language **British English** (`en-GB`, British spelling). Every UI string goes through i18n.

### iOS PWA facts to design around
- Web Push works only after the app is added to the Home Screen; there is no install prompt, so an onboarding screen must teach "Share → Add to Home Screen" and then request notification permission from a user tap.
- No Background Sync / Periodic Sync: every timed reminder must be sent **server-side** (cron + push).
- No Share Target, no widgets, no vibration, no Bluetooth/NFC.
- `getUserMedia` (camera), Web Speech Recognition, Wake Lock and the Badging API are available.
- The app cannot stop the user leaving; "blocking" screens only block inside the app.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React + TypeScript, `vite-plugin-pwa` (service worker, manifest) |
| Routing | React Router |
| Styling | CSS modules or plain CSS with the design tokens in §8 |
| Backend | **Supabase** free plan: Postgres, Auth (Google), Storage, Realtime, Edge Functions |
| Scheduled jobs | Supabase Cron (pg_cron) calling Edge Functions. If Cron is not available on the free plan, use a scheduled GitHub Actions workflow that calls the Edge Function (no extra account; runs can be delayed a few minutes) |
| Push | Web Push with VAPID keys, sent from an Edge Function (`web-push` via `npm:` specifier in Deno) |
| Hosting | **GitHub Pages** (free, HTTPS), deployed by a GitHub Actions workflow on push to `main`. Use a Vite `base` matching the repo path and a SPA 404 fallback |

Accounts needed: **GitHub and Supabase only** (Supabase can be signed into with GitHub).

Free-plan notes: 500 MB database, 1 GB storage, 500k Edge Function calls/month; **a free project pauses after one week without activity** (daily use prevents this).

Login is **email one-time code** (Supabase Auth email OTP: enter email → receive a 6-digit code → type it in the app). Do not use magic links: on iOS the link opens in Safari, and a Home Screen app does not share storage with Safari, so the session would land in the wrong place. No Google Cloud and no Apple Developer account needed. Sessions persist, so each person signs in once.

---

## 3. Identity and access

- Table `allowed_users(email text primary key, role text check (role in ('yoyo','kyle')))`, seeded with the two emails (Yoyo fills these in; never hard-code them in the repo).
- On first sign-in, a trigger creates `profiles` only if the email is in `allowed_users`; otherwise sign the user out and show "這個 App 只給又又和鍇鍇使用".
- Every table has **RLS on**. Both users can read shared data; writes are restricted by role where the spec says so (e.g. only Yoyo can insert `hand_scores`; nobody approves their own water log).

---

## 4. Data model (Postgres)

```
profiles          id uuid pk = auth.uid, role ('yoyo'|'kyle'), display_name, lang ('zh-Hant'|'en-GB'), created_at
push_subscriptions id, user_id, endpoint unique, p256dh, auth, created_at
coin_ledger       id, role, amount int (+/-), reason text, ref_table, ref_id, created_at
                  -> balance = sum(amount) per role (view `coin_balances`)
bear              id = 1 (single row), water, clean, mood, energy (int 0-100),
                  illness text null, severity ('mild'|'moderate'|'severe') null,
                  caused_by ('yoyo'|'kyle') null, ill_since timestamptz,
                  hospital_until timestamptz null, admitted_at timestamptz, updated_at
bear_events       id, kind, payload jsonb, created_at   -- history for the ward screen
water_logs        id, role, full_path, empty_path, status ('pending'|'approved'|'rejected'),
                  reviewed_by role, created_at, reviewed_at
water_requests    id, from_role 'kyle', to_role 'yoyo', created_at, resolved_at null,
                  next_ping_at, snoozes int default 0
hand_scores       id, delta (+1|-1), created_by 'yoyo', created_at
chores            id, owner 'kyle', kind ('shave'|'nails'), interval_days (3|9), last_done_at
food_wishes       id, name, who ('yoyo'|'kyle'), source_index int default 0, cooked_at null, created_at
wheel_options     id, name unique
shopping_items    id, list ('grocery'|'stuff'), name, added_by role, done bool, created_at
treatments        id, kind ('medicine'|'injection'|'hospital'), cost, paid_by role, created_at
user_task_defs    id, owner role, title, created_at   -- "＋新增我的任務" (simple checklist tasks, phase 2)
```

Storage: private bucket `water-photos`, path `{role}/{log_id}/{full|empty}.jpg`, read via signed URLs. Delete photos 14 days after review (cron).

---

## 5. Game rules (put every number in `src/config/rules.ts`)

### Earning coins (站幣, virtual only)
| Action | Coins |
|---|---|
| One cup of water, approved by the partner | +5 to the drinker |
| Shave / trim nails marked done on or before the due day | +5 to Kyle |
| Hand-drying rated +1 | +2 to Kyle |
| 7-day perfect streak (every daily rule met by that person) | +30 |
| Cook a dish from the wish list (tap 「煮了！」) | +10 to each |
| Last item ticked on a shopping list | +5 to whoever ticked it |

### Bear stats and illnesses
- Stats are 0–100, **floor 5** (the bear never dies; worst case is hospital).
- Owners shown on the ward: 水分 = Yoyo, 清潔 = Kyle, 心情 & 體力 = both.

| Trigger | Effect | Illness | Caused by |
|---|---|---|---|
| Yoyo has fewer than 8 approved cups at day end (Europe/London) | water −20 | 脫水 dehydration | yoyo |
| Hand-drying −1 | clean −10 | 手手龜裂 cracked paws (if clean < 40) | kyle |
| Hand-drying +1 | clean +5 | — | — |
| Shave overdue ≥ 1 day | clean −10 per day | 毛毛疹 rash | kyle |
| Nails overdue ≥ 1 day | clean −10 per day | 指甲倒插 ingrown claw | kyle |
| Approved cup (Yoyo) | water +10 | — | — |
| Any illness active | mood −5 per day | — | — |
| Treatment | mood +15, the related stat +30/+50/+65 | cured | — |
| Cooked from wish list | energy +10 | — | — |
| No task done by either person in a day | energy −10 | — | — |

- Only one illness at a time; if a new one triggers while ill, keep the more severe and record the other in `bear_events`.
- **Severity escalates if untreated:** mild → moderate after 2 days → severe after 4 days.
- **Treatment:** 吃藥 30 cures mild · 打針 80 cures mild/moderate · 住院 200 cures anything but the bear is "waiting for a bed" for 2 hours (`hospital_until`) before it is cured.
- **Whoever caused the illness pays.** The pay button is enabled only on the payer's phone; the other person sees "等鍇鍇付醫藥費" and can tap a nudge that sends a push.
- If the payer cannot afford it, show how many coins are missing and which tasks earn them.

### Water flow
- Daily goal: 8 cups for Yoyo (Kyle also logs water; it earns coins but does not affect the bear).
- **Self-initiated:** either person can open the camera any time.
- **Kyle → 「叫又又喝水」:** creates a `water_request`, sends a push to Yoyo, and re-pings every 30 min until she submits a log or snoozes.
- **Snooze 「我很飽，等等再喝」:** delays 30 min, max **2 per day**. A few sips count as a cup.
- **While a request is open, opening the app shows a full-screen request card first** (the closest thing to "must do it before leaving").
- **Camera:** in-app live camera only (`getUserMedia`), **no file input, no photo library**. Step 1 photo with water → step 2 photo after drinking → upload both → status `pending` → push to the partner → partner taps 核可 / 退回. Approved → coins + stats. Rejected → push back with "請重拍".
- Compress to max 1080 px JPEG q≈0.7 before upload. Add a timestamp overlay so old photos cannot be reused.
- Do not attempt water-level detection; partner approval is the verification.

### Kyle's chores
- Shave every 3 days, nails every 9 days (from `rules.ts`). Countdown ring per chore on Kyle's tab; 「完成了」 resets `last_done_at`.
- Push to Kyle at 09:00 on the due day and every day while overdue.

### Hand-drying score
- Only Yoyo can score (+1 有擦乾 / −1 沒擦乾). Kyle sees the running score and history read-only, and gets a push for each score.

---

## 6. Screens (match `design/`)

Bottom navigation on **every** screen, fixed at the bottom, content scrolls above it and is never covered:
`又又 · 吃什麼 · [病房 — big round centre button] · 清單 · 鍇鍇`. The current tab is highlighted.

1. **Ward 熊熊病房 (home, `/`)** — both coin balances with avatars, settings gear, bear-in-bed illustration (sick vs healthy state), status chip (illness + severity, or 健康), stay counter, four stat bars with owner tags, three treatment buttons with costs, toast feedback.
2. **Yoyo tab (`/yoyo`)** — open water request card (go / snooze with remaining count), today's cups (8 drops; light-filled = pending), 「我自己拍照喝水」, review list for Kyle's water logs, hand-drying scoring with history, 「＋新增我的任務」.
3. **Kyle tab (`/kyle`)** — 「叫又又喝水」, review list for Yoyo's water logs, shave/nails countdown rings with 「完成了 +5」, his water + camera, his hand-drying score (read-only), 「＋新增我的任務」.
4. **Food 今天吃什麼 (`/food`)** — text input + who-chips (又又想吃 / 鍇鍇想吃) + 添加; spinner (options = `wheel_options` **plus** current wish-list items, de-duplicated) with 再轉一次 / 添加給X and a link to edit options; two lists 又又想吃 / 鍇鍇想吃, each item: 看食譜 · {source}, 換一個 (cycles source), 煮了！, delete.
   Recipe sources (cycle order): YouTube search `https://www.youtube.com/results?search_query={name}+食譜`, 愛料理 `https://icook.tw/search/{name}/`, Google `https://www.google.com/search?q={name}+食譜`. Open in a new tab. No paid AI.
5. **Lists 購物清單 (`/lists`)** — tabs 買菜 / 日用品 with counts, add item with 誰加的 chips, checkbox items with owner tag colour, 已買 X / Y, 清除已買的. Realtime sync between both phones.
6. **Settings (`/settings`)** — account (signed-in name and email, sign out; the mockup says "用 Google 帳號登入", replace with the email), language toggle 繁體中文 / English (UK), rules explainer generated from `rules.ts` (earn / what makes the bear ill / treatment costs + "whoever caused it pays" + "the bear never dies"), spinner options editor, notification status + re-enable button.
7. **Onboarding (first run)** — enter email → type the 6-digit code → if not installed, show "加入主畫面" steps with screenshots-style illustrations → after install, a button to turn on notifications.

Use Supabase Realtime so both phones update live (water logs, scores, lists, bear).

---

## 7. Notifications (push) summary

| Event | To | When |
|---|---|---|
| 叫又又喝水 | Yoyo | immediately, then every 30 min until resolved/snoozed |
| Snooze expired | Yoyo | 30 min after snooze |
| Water log submitted | partner | immediately |
| Water log approved/rejected | drinker | immediately |
| Yoyo self-reminder | Yoyo | 10:00, 13:00, 16:00, 19:00 if behind pace (Europe/London) |
| Hand score | Kyle | immediately |
| Chore due / overdue | Kyle | 09:00 daily |
| Bear fell ill / severity up | both | when it happens (say who must pay) |
| Payment nudge | payer | on tap |

Set the app badge to the number of items waiting for the current user (pending reviews, open requests).

---

## 8. Design tokens (from the mockups)

- Background `#FFF8EF` (Kyle tab `#F6F9FE`), cards `#FFFFFF`
- Outline / brown `#8A4B36`, text `#4A2C22`, muted `#8F6F62`, dashed dividers `#EED9C8`
- Yoyo pink `#C2416A` (light `#FFE7EC`, soft `#F7B6C2`, border `#F3C6D2`)
- Kyle blue `#2F63A6` (light `#E3EFFC`, border `#C5DBF3`)
- Stats: water `#6FA8E6`, clean `#7CC6A4`, mood `#F38BA0`, energy `#F2B266`
- Success `#3F8A69`, bear fur `#E8B07A`, muzzle `#FFE7C7`, blanket `#F7B6C2`
- Fonts: Noto Sans TC (body/headings), Fredoka (numbers, Latin labels) from Google Fonts
- Radius: cards 20–24 px, buttons 12–16 px, pills 999 px; borders 2 px brown on key cards; touch targets ≥ 44 px
- Hand-drawn look: brown strokes on illustrations, soft blush ellipses. Icons are inline stroke SVGs; no emoji.
- Phone layout reference size 390 × 844; respect `env(safe-area-inset-*)`.

---

## 9. Milestones (build in this order, commit after each)

0. Scaffold Vite + React + TS + PWA (manifest name 「又鍇站」, short name 「YK站」, bear-face icon 180/192/512 px, `apple-mobile-web-app-capable`, `black-translucent` status bar). Local dev with a Supabase project.
1. Supabase schema, RLS, `allowed_users` gate, email-code login, profiles.
2. App shell: bottom nav with centre ward button, routes, i18n (zh-Hant / en-GB), design tokens, avatars and bear as components (`assets/`).
3. Ward screen + coin ledger + treatments + bear states.
4. Water: camera flow, storage, review, requests, snooze.
5. Kyle chores + hand-drying score.
6. Push subscriptions, Edge Functions, cron rules engine (day-end checks, escalation, reminders, photo cleanup).
7. Food + spinner + wish lists + recipe links.
8. Shopping lists with realtime.
9. Settings + rules explainer + spinner options.
10. Onboarding + deploy to GitHub Pages + test on both iPhones.

**Phase 2 (not in the mockups, design first):** train tickets (screenshot → on-device OCR with Tesseract.js → who/where/when → reminder; e-mail forwarding needs a paid domain so skip it), voice input (Web Speech API, rule-based parsing, e.g. 「牛奶加到買菜」, 「今天 9 點到 11 點有課」), custom personal tasks.

---

## 10. Working agreement for Claude Code

- Ask Yoyo before anything that needs her accounts, secrets or money. Never commit secrets; use `.env.local`, Supabase secrets and GitHub Actions secrets. (The Supabase anon key is public by design; the service-role key and VAPID private key are not.)
- Keep game numbers in `rules.ts`, strings in locale files, colours in tokens.
- After each milestone: run it, show Yoyo what to test on her phone, then commit.
- Yoyo is an EEE student who wants to learn: briefly explain the important parts (auth, RLS, push, service worker) when you build them.
