# Loop Habit Tracker — iOS Standalone PWA

A complete, production-ready, offline-first Progressive Web App (PWA) replicating the core UI, interactions, and exponential habit-strength mechanics of **Loop Habit Tracker** ([iSoron/uhabits](https://github.com/iSoron/uhabits)) specifically tuned for iOS Safari standalone mode (*Add to Home Screen*).

---

## 🚀 Features

### 1. Authentic Loop Habit Strength Scoring Engine
- **Exponential Moving Average (EMA):**
  $$\text{Score}_t = \text{Score}_{t-1} \times \alpha + \text{Value}_t \times (1 - \alpha)$$
- **Dynamic Smoothing Factor ($\alpha$):**
  $$\alpha = 0.5^{1 / \text{halfLifeInDays}}, \quad \text{halfLife} = \frac{13}{\sqrt{\text{Frequency}}}$$
  - Daily habit: half-life = 13 days
  - 1×/week habit: half-life $\approx$ 34.4 days
- **Non-Daily Frequency Windows & Interval Snapping:** Non-daily habits (e.g. 3×/week) automatically cover intervening days (`YES_AUTO`), avoiding artificial score drops.
- **Skipped Days:** Skipped days preserve the score and streak without penalty.
- **Streaks & Analytics:** Real-time computation of current streak, best streak, total checks, 30-day net score trend, and completion rate.

### 2. User Interface & Mechanics
- **Main Screen:**
  - Header with filter segmented pills (**Active**, **All**, **Archived** with dynamic badges).
  - Quick action buttons for manual drag-and-drop reordering, settings & backup, and habit creation.
  - Aligned 5-day calendar slider header (`T-4`, `T-3`, `T-2`, `Yesterday`, `Today`).
- **Habit Row Card:**
  - Habit color accent strip.
  - Score percentage ring with smooth SVG stroke animations.
  - Flame streak badge (`3d`, `12d`, etc.).
  - 5-day check buttons:
    - **Single tap cycle:** `None` (gray outline) $\rightarrow$ `Completed` (filled with habit color + checkmark) $\rightarrow$ `Skipped` (diagonal slash) $\rightarrow$ `None`.
    - Haptic micro-feedback and pop animations.
  - **Tap or long-press** on habit title opens the detailed view.
- **Habit Detail Sheet:**
  - iOS-style modal bottom sheet with drag-to-dismiss handle.
  - 4 summary stats cards (Current Streak, Best Streak, Total Checks, Completion Rate).
  - **Score Trend Chart:** Interactive SVG sparkline with 30-day and 90-day range filters, horizontal target guides (25%, 50%, 75%, 100%), and touch scrub inspection.
  - **6-Month Calendar Heatmap:** Month-by-month grid layout with interactive in-place day toggling and color-coded status legends.
  - Edit, Archive/Unarchive, and Delete actions with confirmation alerts.
- **Add / Edit Habit Modal:**
  - Habit title, optional question/notes.
  - 12 curated Loop Material color swatches with contrast adaptation for dark mode.
  - Frequency presets: *Every day*, *X times per week*, *X times per month*, or *Custom (X times every Y days)* with dynamic score half-life preview.

### 3. Loop CSV Import & Export Compatibility
- **Export:**
  - Generates a single ZIP package containing:
    - `Habits.csv`: `Position, Name, Description, Color, Frequency_Num, Frequency_Den, Archived`
    - `Repetitions.csv`: `Timestamp, Habit_Name, Value` (where `2` = Completed, `3` = Skipped)
    - `Checkmarks.csv`: Wide matrix format matching Loop's computed checkmarks.
  - Uses the native iOS Web Share sheet ("Save to Files", AirDrop, Mail) with an automatic download fallback.
- **Import:**
  - Accepts standard Loop ZIP files or standalone `Habits.csv` and `Repetitions.csv` files.
  - Preserves existing data through intelligent name-matching merge or replace mode.
  - Also parses official Android Loop ZIP folder structures (e.g. `001 Meditate/Checkmarks.csv`).

### 4. iOS Safari Standalone PWA Tuning
- **Viewport & Insets:**
  - `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`
  - Safe-area insets handled via Tailwind tokens (`pt-[env(safe-area-inset-top)]`, `pb-[calc(env(safe-area-inset-bottom)+32px)]`).
- **WebKit Web App Meta Tags:**
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
  - `<meta name="apple-mobile-web-app-title" content="Loop Habits">`
- **Native-Like Gesture Behavior:**
  - `overscroll-behavior-y: none;` prevents Safari pull-to-refresh rubber-band bounce.
  - `user-select: none;` prevents accidental text selection while keeping inputs selectable.
  - Form inputs set to `16px` to avoid iOS Safari auto-zoom on focus.
- **Full PWA Offline Caching:**
  - Built with `vite-plugin-pwa` generating Workbox service worker caching all scripts, styles, web fonts, and HTML.
  - PWA asset generator configured to produce Apple touch startup splash screens for all modern iPhone screen sizes (iPhone SE, 13 mini, 14, 15 Pro, 16 Pro, 17, and Air) in both Light and Dark modes.
  - Storage persistence manager (`navigator.storage.persist()`) prevents Safari 7-day auto-eviction.

---

## 🛠 Tech Stack

- **Runtime & Bundler:** Vite 8 + TypeScript 7
- **UI & State:** React 19 + Dexie.js 4 (IndexedDB) + `dexie-react-hooks`
- **Drag & Drop:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **Styling:** Tailwind CSS 3 (semantic CSS variable tokens) + Lucide React
- **Zip Compression:** `fflate` (fast, lightweight zero-dependency zip/unzip)
- **Typography:** `@fontsource-variable/inter`
- **PWA Tooling:** `vite-plugin-pwa` + `@vite-pwa/assets-generator`
- **Testing:** Vitest

---

## 📦 Directory Structure

```text
├── index.html                   # iOS notch-optimized shell with pre-paint theme script
├── package.json                 # Project dependencies and build scripts
├── postcss.config.js            # PostCSS configuration
├── pwa-assets.config.ts         # iOS splash screen and PWA icon preset configuration
├── tailwind.config.js           # Tailwind configuration with CSS variables & safe-area tokens
├── tsconfig.json                # TypeScript project solution configuration
├── vite.config.ts               # Vite configuration with PWA Service Worker & Workbox caching
├── public/                      # Static assets, SVG logo, generated icons & splash screens
└── src/
    ├── main.tsx                 # Application entry point
    ├── App.tsx                  # Main screen, Top Bar, Filter tabs, DnD list, and Modals
    ├── types.ts                 # Domain interfaces (Habit, Repetition, HabitStats)
    ├── index.css                # CSS variables design system, reset, and iOS gestures
    ├── db/
    │   ├── db.ts                # Dexie IndexedDB schema & persistent storage request
    │   └── actions.ts           # Transactions: create, update, delete, reorder, tap-cycle
    ├── lib/
    │   ├── dates.ts             # Timezone-safe UTC integer day index arithmetic
    │   ├── scoring.ts           # Loop scoring engine (half-life, EMA, intervals, streaks)
    │   ├── colors.ts            # Loop palette definitions & dark mode luminance lift
    │   ├── csv.ts               # RFC 4180 CSV reader and writer
    │   ├── loopCsv.ts           # Loop CSV export/import matching iSoron/uhabits
    │   ├── share.ts             # Web Share API delivery with download fallback
    │   ├── uuid.ts              # RFC 4122 v4 UUID generator
    │   ├── scoring.test.ts      # Unit tests for Loop scoring algorithms
    │   └── loopCsv.test.ts      # Unit tests for Loop CSV import and export
    ├── hooks/
    │   ├── useHabitsData.ts     # Live IndexedDB query hook returning calculated stats
    │   ├── useToday.ts          # Midnight rollover and foreground synchronization hook
    │   ├── useSettings.ts       # Synchronous settings store (Theme, slider direction)
    │   └── useLongPress.ts      # Scroll-tolerant pointer long-press hook
    └── components/
        ├── HabitRow.tsx         # Habit card row with 5-day check buttons & drag handle
        ├── CheckButton.tsx      # Multi-state checkmark button with pop micro-animation
        ├── ScoreRing.tsx        # Animated SVG habit-strength circular score ring
        ├── HabitDetailModal.tsx # Full statistics sheet (heatmaps, trend chart, options)
        ├── HabitScoreChart.tsx  # Interactive SVG score line chart (30d/90d ranges)
        ├── HabitCalendarHeatmap.tsx # 6-month calendar heatmap with in-place toggling
        ├── HabitFormModal.tsx   # Add/Edit habit bottom sheet with color & frequency pickers
        ├── SettingsModal.tsx    # Theme toggle, Loop CSV backup/restore, demo loader
        ├── IosInstallBanner.tsx # Native Safari Add-to-Home-Screen prompt
        ├── PwaUpdateToast.tsx   # Service worker update notification listener
        ├── Sheet.tsx            # Reusable iOS bottom sheet with gesture dismiss
        ├── ConfirmDialog.tsx    # Native-styled confirmation alert dialog
        └── Toast.tsx            # In-app toast notification system
```

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Run Test Suite
```bash
npm test
```

### 4. Build for Production & Precache
```bash
npm run build
```

### 5. Preview Production PWA Locally
```bash
npm run preview
```

Open `http://localhost:4173/` in Safari on iOS or your desktop browser.

---

## 📲 Installing on iOS Safari
1. Open the app URL in **Safari**.
2. Tap the **Share** button in the Safari navigation toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm by tapping **Add** in the top right.
5. Launch the app directly from your Home Screen to experience the full-screen, notch-padded, standalone offline app.
