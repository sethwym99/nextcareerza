## Plan: Android Camera & Microphone Permissions

### Current state
- `AndroidManifest.xml` only declares `INTERNET` and `BILLING`.
- The interview route calls `navigator.mediaDevices.getUserMedia()` directly, which works in browsers but can fail silently on Android unless runtime permissions are requested first.
- No Capacitor permission plugin is installed or used.

### What we will build

1. **Declare permissions in AndroidManifest.xml**
   Add the required uses-permissions:
   - `android.permission.CAMERA`
   - `android.permission.RECORD_AUDIO`
   - `android.permission.MODIFY_AUDIO_SETTINGS`

2. **Install and configure the Capacitor Permissions plugin**
   Add `@capacitor-community/android-permissions` (or use the built-in Capacitor Permissions API if available) so the app can request dangerous permissions at runtime.

3. **Create a cross-platform permission helper**
   New file: `src/lib/permissions.ts`
   - `requestCameraPermission()` — on native Android, calls the plugin; on web, returns granted immediately.
   - `requestMicrophonePermission()` — same pattern.
   - Returns `{ state: 'granted' | 'denied' | 'prompt' }` so the UI can react.

4. **Update the interview setup flow**
   In `src/routes/_authenticated.interview.tsx`:
   - Before calling `getUserMedia`, call the helper to request camera + microphone.
   - If denied, show a clear message explaining the permission is required and a button to open Android Settings (using `App` plugin).
   - Keep the existing web flow unchanged.

5. **Add a permission-gate UI**
   Show a pre-interview screen with:
   - "Camera access" and "Microphone access" rows.
   - A "Grant permissions" button.
   - Error state if permissions are permanently denied with instructions to enable them in Settings.

6. **Verify manifest and build**
   - Confirm `android/app/src/main/AndroidManifest.xml` includes the new entries.
   - Confirm `npx cap sync android` is run in `codemagic.yaml` so the plugin native code is included.

### Out of scope
- iOS permission strings (`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`) — focus is Android only per your direction.
- Changing the interview AI logic or face-tracking behavior.

### Files to change
- `android/app/src/main/AndroidManifest.xml`
- `package.json` (add permission plugin)
- `src/lib/permissions.ts` (new)
- `src/routes/_authenticated.interview.tsx`
- `codemagic.yaml` (ensure `npx cap sync android` runs)

### Acceptance criteria
- Fresh install on Android shows a runtime permission dialog when the user starts an interview.
- Granting permissions starts the camera/microphone normally.
- Denying permissions shows a helpful message instead of a blank camera or console error.
- Web preview continues to work exactly as before.