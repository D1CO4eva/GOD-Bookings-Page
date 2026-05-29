# File Reference

This reference covers key code/config files in the repository (excluding `node_modules` and built `dist` output).

## Root Orchestration

| File | Purpose | Key Behavior |
|---|---|---|
| `package.json` | Root scripts for web/mobile workflows. | `dev`, `build`, `preview`, `check`, `mobile:*`, `deploy:ftps`. |
| `vite.config.ts` | Web build/dev config. | Serves `apps/web`, aliases `@` and `@shared`, outputs to root `dist/`. |
| `tsconfig.json` | Root TypeScript config. | Path aliases for `apps/web/src` and `packages/shared/src`; excludes mobile app. |
| `scripts/generateProgramImageManifest.mjs` | Generates shared program image map. | Scans `apps/web/public/program-images`, writes `packages/shared/src/programImageManifest.ts`. |
| `scripts/postBuildCleanup.mjs` | Removes `dist/.htaccess` after build. | Keeps deployment output aligned with hosting setup. |
| `scripts/deployFtps.mjs` | FTPS upload script. | Uploads local build output to configured remote directory. |
| `scripts/mobileAndroid.ps1` | Android dev launcher. | Starts/reuses emulator, starts Metro, runs Android dev client. |
| `scripts/ios/*` | iOS operation scripts. | Preflight validation plus TestFlight/production build and submit wrappers. |
| `README.md` | Project overview and commands. | Docs links and operational quick start. |

## Web App (`apps/web/`)

| File | Purpose | Key Exports / Behavior |
|---|---|---|
| `apps/web/index.html` | Web shell and global fonts/styles. | Mount point plus Vite entry (`/src/index.tsx`). |
| `apps/web/src/index.tsx` | React bootstrap entrypoint. | Mounts `<App />` into `#root`. |
| `apps/web/src/App.tsx` | Main web orchestrator and page renderer. | Booking + reservation state machine and route sync. |
| `apps/web/src/components/*` | Web UI building blocks. | Header/footer/cards/modals/form/calendar views plus the AI booking agent. |
| `apps/web/src/components/ai-booking/*` | AI booking feature UI. | Uddhav chat page, guided booking controls, and reservation-management panels. |
| `apps/web/src/services/googleSheetsService.ts` | Web API adapter. | Web-facing wrapper around shared booking client. |
| `apps/web/src/services/openRouterService.ts` | AI service adapter. | Calls the GOD Auth Service AI booking proxy and normalizes structured booking extraction. |
| `apps/web/src/utils/*` | Web-specific helpers and shared re-exports. | Route mapping + date/program/slot/asset helper surface. |
| `apps/web/src/constants.tsx` | Web constants surface. | Re-exports shared `PROGRAMS` and `ZELLE_EMAIL`. |
| `apps/web/src/types.ts` | Web page enums + shared type re-exports. | `Page`, `FormErrors`, shared domain types. |
| `apps/web/public/.htaccess` | Apache SPA rewrite/caching config. | Ensures production route handling under `/homebookings/`. |

## Mobile App (`apps/mobile/`)

| File | Purpose | Key Exports / Behavior |
|---|---|---|
| `apps/mobile/App.tsx` | Native app root and navigation flow. | Booking + reservation orchestration via React Navigation. |
| `apps/mobile/app.json` | Expo app manifest. | App identity, Android package, iOS bundle id/build number, EAS project id. |
| `apps/mobile/eas.json` | EAS build/submit profile config. | Android preview/production plus iOS TestFlight/production profiles. |
| `apps/mobile/src/screens/*` | Mobile booking/reservation screens. | Program browse, date/slot, form, verify/edit/cancel, result flows. |
| `apps/mobile/src/components/ProgramCardMobile.tsx` | Mobile program card UI. | Rotating images + availability/donation/checklist/video actions. |
| `apps/mobile/src/api/client.ts` | Mobile API client bootstrap. | Configures shared API client via Expo env vars. |
| `apps/mobile/src/utils/programMedia.ts` | Mobile image URL adapter. | Uses shared manifest + shared asset resolver for remote image URLs. |
| `apps/mobile/src/theme/tokens.ts` | Mobile design tokens. | Brand palette, radii, spacing, and shadows. |
| `apps/mobile/metro.config.js` | Expo/Metro workspace config. | Watches workspace root and resolves shared dependencies correctly. |

## Shared Package (`packages/shared/`)

| File | Purpose | Key Exports |
|---|---|---|
| `packages/shared/src/types.ts` | Shared domain models for web + mobile. | `DevotionalProgram`, `BookingData`, `ReservationDetails`, etc. |
| `packages/shared/src/programCatalog.ts` | Shared program catalog/constants. | `PROGRAMS`, `ZELLE_EMAIL`, `DEFAULT_API_BASE`. |
| `packages/shared/src/apiClient.ts` | Shared booking/reservation API client. | `createBookingApiClient`. |
| `packages/shared/src/slotUtils.ts` | Shared slot/day rule helpers. | `generateSlots`, `isDateSelectable`, `toSlotLabel`. |
| `packages/shared/src/programUtils.ts` | Shared program normalization/rule helpers. | `normalizeProgramType`, `isNamaBhikshaType`, `resolveProgramByType`, etc. |
| `packages/shared/src/availabilityUtils.ts` | Shared availability derivation helpers. | Blocked-date/slot derivation for booking/edit flows. |
| `packages/shared/src/dateUtils.ts` | Shared date-key helpers. | `toDateKey`, `parseDateKey`. |
| `packages/shared/src/assetUtils.ts` | Shared static asset URL helper. | `resolvePublicAssetUrl`. |
| `packages/shared/src/programImageManifest.ts` | Generated shared image manifest. | Program ID -> image URL list map. |
| `packages/shared/src/index.ts` | Shared barrel exports. | Single import surface for common shared APIs. |
