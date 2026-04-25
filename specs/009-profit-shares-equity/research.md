# Research & Architecture Decisions

**Feature**: Profit Shares & Equity Purchasing
**Branch**: `009-profit-shares-equity`

## Technical Context

The following decisions are based on the user-provided tech stack and project constraints.

### 1. Framework & Rendering
- **Decision**: Next.js 14 App Router with React Server Components (RSC)
- **Rationale**: Standardizes the application on the latest React paradigm, optimizing for performance and SEO while reducing client-side JavaScript.
- **Alternatives considered**: SPA React (rejected due to SEO and initial load performance issues), Pages Router (deprecated in favor of App Router).

### 2. Data Mutations
- **Decision**: Next.js Server Actions
- **Rationale**: Allows seamless RPC-style calls from client to server, perfectly integrated with Next.js App Router for forms and state mutations without needing a separate API layer.
- **Alternatives considered**: Traditional REST API routes (rejected due to boilerplate and lack of type safety), GraphQL (overkill).

### 3. Database & Auth
- **Decision**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Rationale**: Provides secure, scalable, and real-time capable database access. RLS ensures that users can only interact with their own data directly from the client (if needed), though Server Actions will handle mutations securely.
- **Alternatives considered**: MongoDB, custom PostgreSQL (rejected due to existing Supabase infrastructure).

### 4. Storage
- **Decision**: Supabase Storage (`equity-receipts` bucket)
- **Rationale**: Seamlessly integrates with the existing Supabase ecosystem and handles image uploads efficiently.
- **Alternatives considered**: AWS S3 directly, Cloudinary (rejected to keep infrastructure consolidated).

### 5. Styling & UI
- **Decision**: Strict Tailwind CSS following "Impeccable.style" framework (Dark mode `bg-slate-950`, soft UI, `rounded-2xl`, glassmorphism, soft borders `border-slate-800`). Strict RTL logical properties (`start-`, `end-`, etc.). `lucide-react` for icons (ZERO-EMOJI policy).
- **Rationale**: Ensures a consistent, premium, Arabic-first user experience that aligns perfectly with the application's established design system.

### 6. Concurrency Control
- **Decision**: First-Write-Wins atomic SQL update in Server Action for admin approvals.
- **Rationale**: Prevents race conditions when multiple admins try to approve the same pending request. The query `UPDATE profit_share_requests SET status = 'accepted' WHERE id = 'X' AND status = 'pending'` ensures only one succeeds.

### 7. Real-time Updates
- **Decision**: Client-side periodic polling (10-15s) for the progress bar.
- **Rationale**: Fulfills the 15-second freshness requirement without the operational complexity of WebSockets or Server-Sent Events.
