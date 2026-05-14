# Implementation Plan: نظام المحادثة المغلقة — Phase 2

**Branch**: `015-chat-phase2-enhanced` | **Date**: 2026-05-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-chat-phase2-enhanced/spec.md`

---

## Summary

Phase 2 extends the Blind Chat System (Feature 014) with five capability pillars, all built on the
existing Phase 1 schema without breaking changes:

1. **Word Filter / Blacklist** — A `SECURITY DEFINER` Postgres RPC (`send_secure_message`) performs
   Arabic-normalized blacklist matching atomically before any message is stored. Blocked attempts log
   to `chat_activity_log` with zero content exposure.
2. **Voice Messages** — Browser-native `MediaRecorder` API (tap-to-toggle, 120 s cap) uploads to the
   existing `secure-chat-media` bucket (MIME types extended). Inline audio players use HTTP Range
   Requests for streaming playback via presigned URLs.
3. **Delivery & Read Receipts (DM-only)** — `delivery_status` field (Phase 1 schema) progresses
   `sent → delivered → read` via Supabase Realtime and `IntersectionObserver` batch updates.
4. **Reply & Forward Threading** — Surfaces the Phase 1 `parent_message_id` field with quote-block
   UI; forwarding uses content-value snapshots to avoid cross-room RLS violations.
5. **Admin Activity Log** — Append-only, real-time audit feed (`/admin/chat/logs`) with 90-day
   tiered archival for `message_sent` events; `message_blocked` and `session_event` retained forever.

---

## Technical Context

| Field | Value |
|---|---|
| **Language / Version** | TypeScript 5 / Node 20 |
| **Framework** | Next.js 14 — App Router, RSC, Server Actions |
| **UI** | Tailwind CSS v3, lucide-react |
| **Database** | Supabase PostgreSQL (Phase 1 schema extended) |
| **Realtime** | Supabase WebSockets — existing `supabase_realtime` publication |
| **Storage** | `secure-chat-media` bucket (audio MIME types added) |
| **Audio** | Browser `MediaRecorder` API — no new npm package |
| **Validation** | Zod (all Server Actions) |
| **Performance Goals** | Blacklist check ≤ 500 ms; status transition ≤ 3 s; log page ≤ 2 s |
| **Constraints** | No cross-room RLS leakage; no message content in logs; no file duplication on forward |

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Gate Question | Status |
|---|---|---|---|
| I | Architecture & Stack | Next.js App Router + Supabase Auth/DB + Tailwind CSS only? | ✅ |
| II | RTL & UI/UX | All new components RTL-first with logical Tailwind utilities and approved palette? | ✅ |
| III | Data Integrity | `created_at` on all new tables; `chat_activity_log` append-only (no UPDATE/DELETE)? | ✅ N/A (non-financial) |
| IV | RBAC | `/admin/chat/blacklist` + `/admin/chat/logs` gated at middleware + RLS on all new tables? | ✅ |
| V | Component Modularity | New hooks + components ≤ 200 lines; `loading.tsx`/`error.tsx` co-located? | ✅ |

---

## Project Structure

### Documentation (this feature)

```text
specs/015-chat-phase2-enhanced/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── server-actions.md
│   └── rpc-contracts.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── dashboard/
│   └── chat/
│       ├── page.tsx                        # Phase 1 — extend with reply/forward context menus
│       ├── [roomId]/
│       │   └── page.tsx                    # Phase 1 — extend with voice input + status badges
│       └── _actions/
│           ├── sendMessage.ts              # REPLACE — now calls send_secure_message RPC
│           ├── markMessagesAsRead.ts       # NEW — batch delivery_status → 'read'
│           ├── markMessageDelivered.ts     # NEW — single delivery_status → 'delivered'
│           └── forwardMessage.ts           # NEW — cross-room forward with snapshot
│
└── admin/
    └── chat/
        ├── blacklist/                      # NEW ROUTE
        │   ├── page.tsx
        │   ├── loading.tsx
        │   ├── error.tsx
        │   └── _actions/
        │       ├── addBlacklistWord.ts
        │       └── deleteBlacklistWord.ts
        └── logs/                           # NEW ROUTE
            ├── page.tsx
            ├── loading.tsx
            ├── error.tsx
            └── _actions/
                └── getActivityLogs.ts

components/
└── chat/
    ├── VoiceRecorder.tsx                   # NEW ("use client") — tap-to-toggle + preview
    ├── AudioPlayer.tsx                     # NEW ("use client") — inline player with duration
    ├── MessageStatusBadge.tsx              # NEW — checkmark indicator (sent/delivered/read)
    ├── ReplyPreview.tsx                    # NEW — quoted-block in input area
    ├── ForwardPicker.tsx                   # NEW ("use client") — room picker modal
    ├── MessageContextMenu.tsx              # NEW ("use client") — reply/forward actions
    ├── ActivityLogFeed.tsx                 # NEW ("use client") — real-time log feed
    └── BlacklistManager.tsx                # NEW ("use client") — forbidden word CRUD table

lib/
└── chat/
    ├── normalize.ts                        # NEW — Arabic normalization utility
    ├── useVoiceRecorder.ts                 # NEW ("use client") — MediaRecorder hook
    └── types.ts                            # EXTEND with Phase 2 types

supabase/
└── migrations/
    └── 20260514000015_015_chat_phase2_enhanced.sql  # NEW
```

**Structure Decision**: App Router with `_actions/` co-location (identical to Phase 1). New admin
sub-routes follow the `app/admin/chat/[sub-route]/` pattern established by Phase 1's groups routes.

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| `SECURITY DEFINER` Postgres function | Blacklist check must be atomic with INSERT — no TOCTOU window | App-layer check → separate INSERT has a race condition: word added between check and insert is not caught |
| `forwarded_quote_snapshot` JSONB (no live FK) | Forwarding a reply across rooms cannot hold a live FK to the source room without RLS leakage | Live `forward_source_message_id` FK exposes source `room_id` to destination-room participants |
