# TEMO Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-05-14

## Active Technologies
- TypeScript 5 / Node 20 + Next.js 14 (App Router, RSC, Server Actions), Supabase JS v2, Zod, Tailwind CSS v3, lucide-react (012-offerwall-tasks-system)
- Supabase Storage — `proofs` bucket (private), path prefix `task-proofs/{user_id}/` (012-offerwall-tasks-system)
- TypeScript 5 / Node 20 + Next.js App Router, Server Actions, Supabase JS v2, Zod, Tailwind CSS, lucide-react (013-app-downloads-profit)
- Supabase PostgreSQL plus private Supabase Storage bucket `app-profit-proofs` (013-app-downloads-profit)
- Supabase PostgreSQL (RLS-enforced) + Supabase Storage bucket `secure-chat-media` (PRIVATE) (014-blind-chat-system)
- TypeScript 5 / Node 20 + Next.js App Router, Supabase Realtime, MediaRecorder API, `chat_blacklist`, `chat_activity_log`, `send_secure_message` RPC, `normalize_arabic_text` (015-chat-phase2-enhanced)

- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (010-investment-trading-cycles)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

cd src; pytest; ruff check .

## Code Style

[e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]: Follow standard conventions

## Recent Changes
- 014-blind-chat-system: Added TypeScript 5 / Node 20 + Next.js 14 (App Router, RSC, Server Actions), Supabase JS v2, Zod, Tailwind CSS v3, lucide-react
- 013-app-downloads-profit: Added TypeScript 5 / Node 20 + Next.js App Router, Server Actions, Supabase JS v2, Zod, Tailwind CSS, lucide-react


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
