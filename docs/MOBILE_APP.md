# Mobile App (Expo, Android + iOS)

This repository includes a native mobile app at `apps/mobile` using Expo + React Native with shared domain logic from `packages/shared`.

## Mobile Structure

- `apps/mobile` - Expo app and React Navigation screens.
- `packages/shared` - Shared types, booking rules, availability logic, API client, and image manifest.
- `scripts/mobileAndroid.ps1` - Android emulator/dev client launcher.
- `scripts/ios/` - Apple-specific preflight/build/submit/dev wrappers.

## Root Commands

From repository root:

- `npm run mobile:start` - Start Expo development server.
- `npm run mobile:android` - Run Android dev build on emulator/device.
- `npm run mobile:ios` - iOS dev entrypoint (runs simulator only on macOS; guides Windows users to cloud TestFlight build).
- `npm run mobile:ios:preflight` - Validate iOS Expo/EAS config and Expo auth.
- `npm run mobile:eas:whoami` - Check Expo auth status.
- `npm run mobile:eas:project:init` - Bind app to Expo project and write project id.
- `npm run mobile:typecheck` - Type-check the mobile app.
- `npm run mobile:build:preview` - Build Android internal APK (teammate testing).
- `npm run mobile:build:production` - Build Android production artifact.
- `npm run mobile:build:ios:testflight` - Build iOS TestFlight artifact in EAS cloud.
- `npm run mobile:build:ios:production` - Build iOS production artifact in EAS cloud.
- `npm run mobile:submit:ios:testflight` - Submit latest iOS build to TestFlight.

## Shared Build-Time Environment

Set these at EAS project scope for both Android and iOS cloud builds:

- `EXPO_PUBLIC_API_BASE`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

Example:

```bash
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_API_BASE --type string --value "<api-base-url>"
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --type string --value "<maps-api-key>"
```

## Android Testing (Direct APK)

1. Run `npm run mobile:eas:whoami`.
2. Run `npm run mobile:eas:project:init` if project binding is not initialized.
3. Confirm `apps/mobile/app.json` includes `expo.extra.eas.projectId`.
4. Run `npm run mobile:build:preview`.
5. Open the finished build in Expo dashboard and share the APK install URL with testers.

`apps/mobile/eas.json` uses an internal APK profile for preview (`distribution: internal`, `android.buildType: apk`, `autoIncrement: true`).

## iOS TestFlight Runbook (Windows-Compatible)

### Prerequisites

- Expo account with access to the configured EAS project.
- Apple Developer Program membership with permissions to manage App Store Connect/TestFlight.
- App Store Connect app record for bundle id `org.godivinity.atlanta.homebookings`.
- `apps/mobile/app.json` contains:
  - `expo.ios.bundleIdentifier = org.godivinity.atlanta.homebookings`
  - `expo.ios.buildNumber` (initialized and then auto-incremented by EAS profile)
  - `expo.ios.infoPlist.ITSAppUsesNonExemptEncryption` boolean
  - `expo.extra.eas.projectId`

### Build + Submit

1. Validate setup:
   - `npm run mobile:ios:preflight`
2. Trigger cloud build:
   - `npm run mobile:build:ios:testflight`
3. Submit to TestFlight:
   - `npm run mobile:submit:ios:testflight`

Expected artifacts:

- EAS cloud produces an iOS archive (`.ipa`) for the `testflight` profile.
- Submission creates a TestFlight processing entry in App Store Connect.

### Common Failure Recovery

- Credential/auth failures:
  - Re-run `npm run mobile:eas:whoami`.
  - Re-authenticate with Expo (`eas login`) and confirm Apple account access in EAS credential prompts.
  - If you see `You are not registered as an Apple Developer`, complete enrollment at `https://developer.apple.com/register/` and then re-run build in interactive mode.
- Bundle identifier mismatch:
  - Ensure `apps/mobile/app.json` `expo.ios.bundleIdentifier` exactly matches the App Store Connect app id.
  - Confirm provisioning profile/certificate in EAS credentials align with that bundle id.
- Build number conflicts:
  - Keep `autoIncrement` enabled in iOS EAS profiles.
  - If conflict persists, update `expo.ios.buildNumber` in `apps/mobile/app.json` to a higher value and rebuild.

## Notes

- Expo managed workflow is intentional: `apps/mobile/ios` remains generated and git-ignored.
- Backend integration remains unchanged (`god-auth-service` endpoints).
- Mobile deep-link routing remains out of scope.
- Add crash/error telemetry (for example Sentry) before production rollout.
