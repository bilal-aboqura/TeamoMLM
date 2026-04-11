# TEMO Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-07

## Active Technologies
- TypeScript 5 / Next.js 15 (App Router) + `@supabase/ssr`, `@supabase/supabase-js`, `zod` (already installed from `001-auth-profile`) (002-packages-tasks)
- Supabase PostgreSQL (existing project) + Supabase Storage (`proofs` private bucket — new) (002-packages-tasks)
- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (005-admin-dashboard)
- [if applicable, e.g., PostgreSQL, CoreData, files or N/A] (005-admin-dashboard)
- TypeScript 5 / Next.js 15 App Router (React 19) + Supabase JS v2 (`@supabase/ssr`), Zod, Tailwind CSS v3 (006-wallet-withdrawals)
- Supabase PostgreSQL (new migration `20260406000010`) (006-wallet-withdrawals)
- TypeScript / Next.js 14 (App Router) + Supabase SSR (`@supabase/ssr`), Tailwind CSS, React 18 (007-user-referrals-tree)
- Supabase PostgreSQL — new tables: `user_referral_stats`, `referral_commissions` (007-user-referrals-tree)

- TypeScript 5 / Next.js 15 (App Router) + `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `next` (001-auth-profile)

## Project Structure

```text
src/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5 / Next.js 15 (App Router): Follow standard conventions

## Recent Changes
- 008-public-landing-page: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]
- 007-user-referrals-tree: Added TypeScript / Next.js 14 (App Router) + Supabase SSR (`@supabase/ssr`), Tailwind CSS, React 18
- 006-wallet-withdrawals: Added TypeScript 5 / Next.js 15 App Router (React 19) + Supabase JS v2 (`@supabase/ssr`), Zod, Tailwind CSS v3


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
