---
trigger: always_on
---

# 🎨 UI/UX Design System & Specification

**Project:** Task-Based Earning & MLM Platform  
**Target Audience:** Arabic speakers (Strictly RTL), Mobile-first users.  
**Vibe/Aesthetic:** Sleek, Premium, Trustworthy, Minimalist (Anti-Generic AI look).

---

## 1. 🧠 Core Design Philosophy (The "Anti-AI" Rules)

To achieve a high-end agency look, all generated UI components MUST adhere strictly to these principles:

- **Whitespace is King:** Use the 8-pt grid system generously. Avoid cramped layouts. Padding should be substantial (`p-6` or `p-8` for containers).
- **Subtle Shadows Only:** Strictly avoid harsh, heavy shadows (`shadow-lg`, `shadow-xl`). Use diffused, soft shadows (`shadow-sm`, `shadow-[0_4px_20px_rgba(0,0,0,0.03)]`).
- **No Border Clutter:** Do not wrap every element in borders. Use negative space and subtle background contrast (e.g., `bg-white` over `bg-slate-50`) to define hierarchy.
- **Meaningful Motion:** All interactive elements must have micro-interactions (e.g., `transition-all duration-300 ease-out hover:-translate-y-1`).

---

## 2. 🎨 Design Tokens & Theme

### A. Color Palette

- **Backgrounds:** \* App Background: `bg-slate-50` (Very light, clean gray).
  - Card/Surface: `bg-white` (Pure white for contrast).
- **Primary (Trust & Action):** \* Deep Slate/Midnight: `slate-900` (For major headings and primary solid buttons).
- **Accent (Wealth & Profit):** \* Emerald Green: `emerald-500` to `emerald-600` (For balances, success states, and level badges).
- **Text/Typography:**
  - Primary Text: `text-slate-900`
  - Secondary Text: `text-slate-500`
  - Muted/Placeholders: `text-slate-400`

### B. Typography & RTL

- **Direction:** Strictly `dir="rtl"`. Use logical properties (`ms-`, `pe-`, `text-start`).
- **Font Family:** Modern Arabic sans-serif (`font-cairo`, `font-tajawal`, or standard system Arabic fonts).
- **Hierarchy:**
  - Page Titles (H1): Text-2xl to 3xl, font-bold, tight tracking.
  - Section Titles (H2): Text-lg to xl, font-semibold.
  - Body: Text-sm to base, relaxed leading (`leading-relaxed`).

---

## 3. 🧩 Core Components Specification

### 3.1 Buttons

- **Primary Action:** `bg-slate-900 text-white rounded-xl py-3 px-6 hover:bg-slate-800 transition-all active:scale-95`.
- **Success/Action:** `bg-emerald-600 text-white rounded-xl shadow-[0_4px_14px_0_rgba(5,150,105,0.39)]`.
- **Secondary/Ghost:** `bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl`.

### 3.2 Inputs & Forms

- **Containers:** Floating labels preferred. Clean borders.
- **Styling:** `border border-slate-200 rounded-xl bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all`.
- **File Upload Area (Crucial for Proofs):** Dashed borders (`border-dashed border-2 border-slate-300`), muted background (`bg-slate-50`), centered upload icon, and hover states (`hover:border-emerald-500 hover:bg-emerald-50/50`).

### 3.3 Cards & Surfaces

- **Glassmorphism (Subtle):** For floating navigations or sticky headers use `bg-white/80 backdrop-blur-md border-b border-slate-200/50`.
- **Data Cards:** `bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]`.

---

## 4. 📱 View Layouts & Hierarchy

### 4.1 Layout Skeleton

- **Mobile:** Bottom floating navigation bar (glassmorphic), hidden on desktop. Top App bar with User Avatar, Rank Badge, and Notifications.
- **Desktop (Admin):** Sleek left-sided (RTL means right-sided) sticky sidebar navigation. Main content area centered with max-width limits for readability.

### 4.2 Auth Pages

- **Visuals:** Centered sleek card, soft gradient background (`bg-gradient-to-br from-slate-50 to-slate-100`).
- **Inputs:** Phone/Password, with a distinct field for "Referral Code".

### 4.3 User Dashboard (Home)

- **Hero Section:** Premium Balance Card showcasing "Available Balance". Use subtle gradients (e.g., `bg-gradient-to-r from-slate-900 to-slate-800`) with emerald text for the numbers.
- **Quick Stats Grid:** 2x2 grid showing current package and tasks remaining.
- **Referral Link:** A visually distinct banner with a 1-click copy button.

### 4.4 Packages View (Subscription)

- **Grid:** Mobile: 1 column. Desktop: 3 columns.
- **Card Design:** Highlight the user's current package. Show lock icon for the 1-year deposit rule. List Daily Tasks and Total ROI clearly.

### 4.5 Task Execution Modal

- **Trigger:** User clicks a task from a clean list view.
- **Modal UI:** Smooth bottom-sheet animation. Displays step-by-step instructions (1. Click Link, 2. Take Screenshot, 3. Upload). Large, clickable dropzone for the screenshot.

### 4.6 Financial Wallet (Manual System)

- **Tabs:** Elegant segmented control toggling between "Deposit" and "Withdraw".
- **Deposit Flow:** Clearly styled "Admin Wallet Info" block (looks like a bank card). Below it, the receipt upload form.
- **Withdraw Flow:** Form requiring Amount + Target Wallet Number, displaying available balance validation below the input.

### 4.7 Admin Dashboard & Referral Tree

- **Data Tables:** Spacious rows, subtle hover states (`hover:bg-slate-50`). Status badges using soft colors (`bg-yellow-50 text-yellow-700` for pending, `bg-emerald-50 text-emerald-700` for approved).
- **Visual Tree:** A node-based UI map (using CSS flex/grid or a library) displaying the hierarchy. Nodes should be sleek avatars with Level badges connected by thin, 1px solid `slate-200` lines.
