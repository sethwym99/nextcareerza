## Fix Codemagic build failure

**Cause:** Capacitor CLI requires Node.js ≥22, but `codemagic.yaml` pins `node: 20`, so `npx cap sync android` aborts with `[fatal] The Capacitor CLI requires NodeJS >=22.0.0`.

**Change:** In `codemagic.yaml`, bump `environment.node` from `20` to `22`. No other steps need to change.

After this, re-run the build in Codemagic — sync, versionCode bump, and AAB build should all proceed.