<p align="center">
  <img src="public/logo.jpeg" alt="Teamo Logo" width="100" height="100" style="border-radius: 20px;" />
</p>

<h1 align="center">Teamo</h1>

<p align="center">
  <strong>Task-Based Earning & Multi-Level Marketing Platform</strong>
</p>

<p align="center">
  <a href="#-architecture"><img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js 15" /></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" /></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Supabase-BaaS-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#-deployment"><img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" /></a>
  <a href="#-design-system"><img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind v4" /></a>
</p>

<p align="center">
  <em>A production-grade, RTL-first platform where users earn by completing daily micro-tasks, subscribe to tiered packages, build referral networks, and manage financial operations — all through a premium, mobile-first Arabic interface.</em>
</p>

---

## 📌 Overview

**Teamo** is a full-stack web application built for the Arabic-speaking market. It enables a scalable task-based earning ecosystem powered by a multi-level referral engine, tiered subscription packages, and a fully manual (admin-controlled) financial pipeline.

The platform is split into three interfaces:

| Interface | Purpose | Access |
|:--|:--|:--|
| **Public Landing** | Marketing, terms, privacy policy | Everyone |
| **User Dashboard** | Task execution, wallet, team tree, packages | Authenticated users |
| **Admin Panel** | User management, deposits, withdrawals, settings | Admin role only |

---

## ✨ Key Features

### For Users

- **Tiered Subscription Packages** — Multiple earning tiers with daily task quotas, ROI projections, and upgrade paths. Includes a "Pay Later" credit-based upgrade option.
- **Daily Task Engine** — Step-by-step task execution with link-based verification and screenshot proof upload via a smooth bottom-sheet modal.
- **Digital Wallet** — Real-time balance tracking, total lifetime earnings, deposit requests with receipt upload, and withdrawal requests with configurable minimum ($10) and dynamic commission rates.
- **Referral Network** — Unique referral codes with 1-click copy, visual downline tree with depth-level rendering, and team performance statistics.
- **Daily Competitions** — Leaderboard-based competitions with automatic ranking and reward distribution.
- **Boost Earnings** — Dedicated view for strategies and promotions to accelerate income.

### For Admins

- **Overview Dashboard** — Platform-wide KPIs and financial summaries at a glance.
- **User Management** — View all users, filter by status, activate/suspend accounts with reason tracking, and manually adjust wallet balances.
- **Deposit Processing** — Review incoming deposit requests, verify uploaded receipts, approve or reject with audit logging.
- **Withdrawal Processing** — Queue-based withdrawal management with commission auto-calculation and approval workflow.
- **Task Administration** — Create, edit, activate/deactivate daily tasks with reward configuration.
- **Salary & Promotions** — Leadership tier promotions and recurring salary management.
- **Competition Management** — Configure and manage daily competitions.
- **Platform Settings** — Global configuration including wallet addresses, commission rates, and operational parameters.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NEXT.JS 15 (App Router)              │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ (public) │  │  dashboard   │  │      admin        │  │
│  │          │  │              │  │                   │  │
│  │ Landing  │  │ Home         │  │ Overview          │  │
│  │ Privacy  │  │ Wallet       │  │ Users             │  │
│  │ Terms    │  │ Packages     │  │ Deposits          │  │
│  │          │  │ Tasks        │  │ Withdrawals       │  │
│  │          │  │ History      │  │ Tasks             │  │
│  │          │  │ Team         │  │ Salaries          │  │
│  │          │  │ Competitions │  │ Competitions      │  │
│  │          │  │ Boost        │  │ Settings          │  │
│  │          │  │ Pay Later    │  │                   │  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
│                                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │              MIDDLEWARE (Auth Guard)               │  │
│  │  Role-based routing · Session refresh · RBAC      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │            SERVER ACTIONS (Zero-API)               │  │
│  │  Auth · Packages · Tasks · Wallet · Admin Ops     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │             ZOD VALIDATION LAYER                   │  │
│  │  auth-schemas · wallet-schemas · admin-schemas     │  │
│  │  packages-tasks-schemas                            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│                      SUPABASE                           │
│                                                         │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  PostgreSQL  │  │   Auth   │  │     Storage       │  │
│  │  22 Migra-   │  │  Phone/  │  │  Receipt Uploads  │  │
│  │  tions       │  │  Password│  │  Task Proofs      │  │
│  │  RPC Funcs   │  │  JWT     │  │                   │  │
│  │  RLS Policies│  │  Roles   │  │                   │  │
│  └─────────────┘  └──────────┘  └───────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|:--|:--|:--|
| **Framework** | Next.js 15 (App Router) | Server components, server actions, streaming, standalone output |
| **Runtime** | React 19 | Concurrent features, `useOptimistic`, form actions |
| **Language** | TypeScript (strict) | End-to-end type safety |
| **Styling** | Tailwind CSS v4 | Utility-first, RTL logical properties, design token system |
| **Font** | Cairo (Google Fonts) | Premium Arabic typography with latin subset |
| **Icons** | Lucide React | Consistent, tree-shakeable icon system (zero emoji policy) |
| **Backend** | Supabase | Auth, PostgreSQL, Row Level Security, RPC, Storage |
| **Validation** | Zod | Runtime schema validation for all server actions |
| **Auth** | Supabase SSR + Middleware | Cookie-based sessions, role-based access control |
| **Deployment** | Docker (multi-stage Alpine) | ~180MB production image, non-root execution |

---

## 📁 Project Structure

```
.
├── app/
│   ├── (auth)/              # Login & Register flows
│   │   ├── login/
│   │   └── register/
│   ├── (public)/            # Landing page, privacy, terms
│   │   ├── privacy/
│   │   └── terms/
│   ├── admin/               # Admin panel (role-gated)
│   │   ├── competitions/
│   │   ├── deposits/
│   │   ├── overview/
│   │   ├── salaries/
│   │   ├── settings/
│   │   ├── tasks/
│   │   ├── users/
│   │   └── withdrawals/
│   ├── dashboard/           # User dashboard (auth-gated)
│   │   ├── _components/     # Shared dashboard components
│   │   ├── boost-earnings/
│   │   ├── competitions/
│   │   ├── history/
│   │   ├── packages/
│   │   ├── pay-later/
│   │   ├── tasks/
│   │   ├── team/
│   │   └── wallet/
│   ├── globals.css
│   └── layout.tsx           # Root layout (RTL, Cairo font)
│
├── components/
│   └── public/              # PublicNavbar, PublicFooter
│
├── lib/
│   ├── auth/                # Referral code gen, rate limiting
│   ├── constants/           # Package tier definitions
│   ├── supabase/            # Client, server, admin SDK wrappers
│   └── validations/         # Zod schemas (auth, wallet, admin, packages)
│
├── supabase/
│   ├── migrations/          # 22 sequential SQL migrations
│   ├── config.toml
│   └── seed.sql
│
├── middleware.ts             # Auth guard + role-based routing
├── Dockerfile               # Multi-stage production build
├── docker-compose.yml        # Container orchestration
├── .dockerignore
├── next.config.ts            # Standalone output mode
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔐 Security Model

| Mechanism | Implementation |
|:--|:--|
| **Authentication** | Phone + password via Supabase Auth with cookie-based SSR sessions |
| **Authorization** | Middleware-level RBAC — `admin` and `user` roles derived from `app_metadata` |
| **Route Protection** | Next.js middleware intercepts all routes; unauthenticated users redirected to `/login` |
| **Admin Isolation** | Admin routes reject non-admin roles; user dashboard redirects admins to `/admin` |
| **Session Expiry** | Automatic detection of stale auth cookies with `?expired=1` redirect parameter |
| **Rate Limiting** | Login attempt throttling at the application layer |
| **Input Validation** | All server actions validated through Zod schemas before processing |
| **Database Security** | Row Level Security (RLS) policies on all Supabase tables |
| **Financial Audit** | Every balance mutation logged in `financial_audit_log` with actor, amount, and reason |
| **Container Security** | Production Docker runs as non-root `nextjs` user (UID 1001) |

---

## 💰 Financial System

The platform operates a **fully manual financial pipeline** — no payment gateway integration. All money movement is admin-verified:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   USER      │     │    ADMIN     │     │  DATABASE   │
│             │     │              │     │             │
│ Upload ─────┼────►│ Review ──────┼────►│ Credit      │
│ Receipt     │     │ Receipt      │     │ Balance     │
│             │     │              │     │             │
│ Request ────┼────►│ Approve ─────┼────►│ Debit       │
│ Withdrawal  │     │ + Pay        │     │ Balance     │
│             │     │              │     │             │
│ Complete ───┼────►│ Verify ──────┼────►│ Credit      │
│ Task        │     │ Proof        │     │ Reward      │
└─────────────┘     └──────────────┘     └─────────────┘
```

**Commission Engine:**
- Dynamic withdrawal commission: **0%** for the first month or users with active referrals, **30%** otherwise
- Configurable minimum withdrawal threshold: **$10**
- Multi-level referral commissions with fixed dollar amounts per package tier
- Leadership salary tiers with automated promotion tracking

---

## 🗄 Database Schema

The database evolves through **22 sequential migrations** covering:

| Migration Group | Tables & Functions |
|:--|:--|
| **Core Identity** | `users`, `login_attempts` |
| **Monetization** | `packages`, `package_sub_requests`, `admin_settings` |
| **Task Engine** | `tasks`, `task_completion_logs` |
| **Financial** | `financial_audit_log`, `withdrawal_requests`, wallet security hardening |
| **Referral Network** | Multi-level referral tree, commission matrix, fixed-dollar commission overhaul |
| **Growth** | Leadership promotions & salaries, daily competitions |
| **Operations** | Withdrawal commission logic, suspension reason tracking |

---

## 🎨 Design System

The UI follows a strict **premium minimalist** design language:

- **RTL-First** — `dir="rtl"` with logical CSS properties throughout
- **Typography** — Cairo font (Arabic + Latin subsets) via `next/font`
- **Color Palette** — Slate-based neutrals with emerald accents for financial success states
- **Components** — Glassmorphic navigation, soft shadow cards (`shadow-[0_4px_20px_rgba(0,0,0,0.03)]`), 2xl border radius
- **Interactions** — `transition-all duration-300` with `hover:-translate-y-1` micro-animations
- **Icons** — Lucide React exclusively (zero emoji policy)
- **Loading States** — Animated skeleton screens for every page
- **Error Boundaries** — Graceful error UI with retry actions on every route

---

## 🐳 Deployment

The application is containerized with a **multi-stage Docker build** optimized for production:

```
Stage 1 (deps)    → npm ci with layer caching
Stage 2 (builder) → next build with standalone output
Stage 3 (runner)  → Alpine + standalone server only (~180MB final image)
```

| Property | Value |
|:--|:--|
| Base Image | `node:20-alpine` |
| Output Mode | `standalone` (self-contained `server.js`) |
| User | `nextjs` (non-root, UID 1001) |
| Port | `3000` |
| Restart Policy | `always` |

---

## 📊 Route Map

```
/                          → Public landing page (redirects if authenticated)
/login                     → Phone + password login
/register                  → Registration with referral code
/privacy                   → Privacy policy
/terms                     → Terms of service
│
├── /dashboard             → User home (balance, package status, quick nav)
│   ├── /wallet            → Deposits, withdrawals, transaction history
│   ├── /packages          → Subscribe/upgrade packages
│   ├── /tasks             → Daily task execution with proof upload
│   ├── /history           → Task logs & subscription request history
│   ├── /team              → Referral link, downline tree, team stats
│   ├── /competitions      → Daily leaderboard competitions
│   ├── /boost-earnings    → Strategies to increase income
│   └── /pay-later         → Credit-based package upgrade
│
├── /admin                 → Admin overview dashboard
│   ├── /users             → User management & suspension
│   ├── /deposits          → Deposit request processing
│   ├── /withdrawals       → Withdrawal approval pipeline
│   ├── /tasks             → Task CRUD & reward configuration
│   ├── /salaries          → Leadership salary management
│   ├── /competitions      → Competition configuration
│   └── /settings          → Platform-wide settings
```

---

## 🧪 Validation Schemas

All user input is validated at the server action boundary using Zod:

| Schema File | Covers |
|:--|:--|
| `auth-schemas.ts` | Login, registration, phone format, password strength |
| `wallet-schemas.ts` | Deposit amounts, withdrawal requests, balance validations |
| `packages-tasks-schemas.ts` | Subscription requests, task completion proofs |
| `admin-schemas.ts` | User actions, settings updates, financial adjustments |

---

## 📄 License

This is proprietary software. All rights reserved.

---

<p align="center">
  <sub>Built with precision for the Arabic-speaking market.</sub>
</p>
