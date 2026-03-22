# Codebase Audit

Audit date: March 20, 2026  
Scope: Entire repository (`App`, components, services, utils, config, entry files, scripts)

## Findings And Actions

1. Duplicated utility logic across files
- Finding: Asset URL resolution and program-availability badge logic were duplicated in multiple components.
- Action: Centralized into shared helpers:
  - `utils/assetUtils.ts`
  - `utils/programUtils.ts`
- Result: Reduced copy-paste logic and made behavior changes safer.

2. Route and program-normalization logic embedded in `App.tsx`
- Finding: Core route parsing/building and program-type normalization logic lived inline in a large component file.
- Action: Extracted reusable helpers:
  - `utils/routeUtils.ts`
  - `utils/programUtils.ts`
- Result: `App.tsx` now consumes shared utilities rather than owning low-level helper implementations.

3. Date-key generation inconsistencies
- Finding: Multiple files used locale-dependent date formatting (`toLocaleDateString('en-CA')`) directly.
- Action: Added `utils/dateUtils.ts` and adopted `toDateKey()`/`parseDateKey()` across app logic.
- Result: Consistent, deterministic `YYYY-MM-DD` date keys across booking, reservation, and calendar logic.

4. Build/config debt
- Finding: `index.html` included stale import-map markup and referenced `/index.css` that was not present, producing build warnings.
- Action: Removed stale import-map and missing CSS link; cleaned title encoding.
- Result: Cleaner Vite output without runtime CSS warning.

5. Unused code and imports
- Finding: Unused `COLORS` constant and unused imports in components.
- Action: Removed dead imports and deleted unused constant.
- Result: Lower noise and improved maintainability.

6. Missing quality gate scripts
- Finding: No lint/typecheck guard script existed.
- Action: Added scripts to `package.json`:
  - `typecheck`
  - `check`
- Result: Repeatable command for local and CI quality checks.

7. Type safety gaps in strict TypeScript check path
- Finding: Running `tsc --noEmit` surfaced missing `ImportMeta.env` typing and weak `Object.entries` inference.
- Action:
  - Added `"vite/client"` to `tsconfig.json` types.
  - Added explicit entry tuple typing where needed in `App.tsx`.
- Result: Typecheck now passes.

## Current Quality Status

- `npm run typecheck`: passing
- `npm run build`: passing
- Shared logic reuse improved via utility extraction
- Technical documentation now present for architecture, flows, setup, and file reference

## Remaining Risk

- `App.tsx` is still large and handles many UI states/pages in one file.  
  Recommendation: split route/page sections into dedicated components over future iterations to reduce regression risk during feature changes.
