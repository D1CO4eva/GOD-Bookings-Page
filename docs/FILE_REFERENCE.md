# File Reference

This reference covers every code/config file in the repository (excluding `node_modules` and built `dist` output).

## Root Files

| File | Purpose | Key Exports / Behavior |
|---|---|---|
| `App.tsx` | Main application orchestrator and page renderer. | Top-level app component with booking + reservation flows. |
| `index.tsx` | React bootstrap entrypoint. | Mounts `<App />` into `#root`. |
| `index.html` | HTML shell and global CSS/font includes. | Root DOM node, Tailwind CDN, Font Awesome, app script include. |
| `constants.tsx` | Static program catalog and donation contact constant. | `PROGRAMS`, `ZELLE_EMAIL`. |
| `types.ts` | Shared domain model types and enum routes. | `Page`, `DevotionalProgram`, `BookingData`, `BookingRecord`, etc. |
| `vite.config.ts` | Build/dev server configuration. | Base path, dev proxy, path alias plugin config. |
| `tsconfig.json` | TypeScript compiler settings. | Bundler module resolution, React JSX, `vite/client` types. |
| `package.json` | Project metadata and scripts. | `dev`, `build`, `preview`, `typecheck`, `check`. |
| `package-lock.json` | NPM dependency lockfile. | Exact dependency graph snapshot. |
| `metadata.json` | Project metadata file. | Environment/tooling metadata. |
| `README.md` | Top-level project overview. | User-facing summary and docs link. |

## Components (`components/`)

| File | Purpose | Key Props / Behavior |
|---|---|---|
| `components/Header.tsx` | Sticky top navigation/header. | Handles site/home/programs/donate actions. |
| `components/Footer.tsx` | Footer with social/contact links. | Displays branding, links, and contact details. |
| `components/ProgramCard.tsx` | Program listing card with media and actions. | `onBook`, `onDonate`, `onManageReservation`; uses image manifest + availability flags. |
| `components/CalendarView.tsx` | Monthly date picker with disabled-date logic. | Uses `isDateSelectable()` to enforce availability. |
| `components/BookingForm.tsx` | Host details form + Google Places address lookup. | Validates fields and emits normalized `BookingData`. |
| `components/DonateModal.tsx` | Donation modal with copy-to-clipboard behavior. | Displays Zelle email and external link. |
| `components/EventPopupModal.tsx` | Fundraiser event modal with teaser/full modes. | Handles registration CTA and body-scroll lock. |

## Services (`services/`)

| File | Purpose | Key Exports |
|---|---|---|
| `services/googleSheetsService.ts` | Booking/reservation API client + payload normalization. | `submitToGoogleSheets`, `fetchBookings`, `verifyReservation`, `updateReservation`, `cancelReservation`. |

## Utils (`utils/`)

| File | Purpose | Key Exports |
|---|---|---|
| `utils/slotUtils.ts` | Slot generation and date-selectability business rules. | `generateSlots`, `isDateSelectable`. |
| `utils/dateUtils.ts` | Canonical date key helpers. | `toDateKey`, `parseDateKey`. |
| `utils/programUtils.ts` | Program-type normalization and availability helpers. | `normalizeProgramType`, `isSatsangType`, `isNamaBhikshaType`, `getProgramAvailabilityFlags`, `resolveProgramByType`, etc. |
| `utils/routeUtils.ts` | App route-path mapping/parsing. | `getPathForPage`, `parsePathToPage`. |
| `utils/assetUtils.ts` | Public asset path resolver with base-path awareness. | `resolvePublicAssetUrl`. |

## Generated / Script Files

| File | Purpose | Notes |
|---|---|---|
| `generated/programImageManifest.ts` | Generated image map for program image folders. | Auto-generated; do not hand-edit. |
| `scripts/generateProgramImageManifest.mjs` | Build/dev pre-step that scans `public/program-images` and emits manifest. | Invoked by `predev` and `prebuild`. |

## Public Hosting Config

| File | Purpose | Notes |
|---|---|---|
| `public/.htaccess` | Apache rewrite/caching configuration for SPA hosting. | Ensures client-side routing compatibility. |
