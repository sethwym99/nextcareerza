## Fix "Build unsigned AAB" failure on Codemagic

**Likely root cause:** The Android project is set to compile with **Java 21** (`android/app/capacitor.build.gradle` → `VERSION_21`), but the Codemagic `mac_mini_m1` instance defaults to an older JDK (usually 17). Gradle's `bundleRelease` then crashes with an "Unsupported class file major version" / "invalid source release: 21" error, which matches a 43-second failure at the Gradle step.

### Changes

**`codemagic.yaml`** — pin JDK 21 before the Gradle step:

```yaml
environment:
  node: 22
  java: 21
```

That's the only edit. Re-run the build after.

### If it still fails

The next most likely cause is Gradle refusing to produce a release bundle without a signing config. Fix would be to add a debug-signed release variant in `android/app/build.gradle` so Codemagic can produce an installable `.aab` for internal testing. I'll only apply this if the Java 21 fix isn't enough — please paste the last ~30 lines of the failed step's log if the rebuild fails so I can confirm.
