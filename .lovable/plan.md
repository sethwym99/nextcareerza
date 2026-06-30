## Fix versionCode bump on Codemagic

**Root cause:** The "Bump versionCode" step uses `$CM_BUILD_ID`, which is a hex string like `a440205ca2d14a4e2716829`. After `sed`, `android/app/build.gradle` line 10 becomes `versionCode a440205ca2d14a4e2716829`, and Gradle interprets that bareword as a property reference → "Cannot get property 'a440205…' on null object".

`versionCode` must be a positive integer. Codemagic exposes `$BUILD_NUMBER` (an auto-incrementing integer per workflow) for exactly this.

### Change

**`codemagic.yaml`** — replace `$CM_BUILD_ID` with `$BUILD_NUMBER` in the Bump versionCode step:

```yaml
- name: Bump versionCode
  script: |
    sed -i.bak "s/versionCode 1/versionCode $BUILD_NUMBER/g" android/app/build.gradle
```

Re-run the build after.
