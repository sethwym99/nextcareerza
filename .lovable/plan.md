## Plan

New key id `9f7b5b617ba6…` with a different private key — this is a real rotation. I'll overwrite the `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` backend secret with the contents of the new file using `set_secret` (it replaces the stored value in place). No code changes needed.

After that, please **delete the old key** `c84bd3f3d7ed…` in Google Cloud Console → Service Accounts → Keys, so the leaked credential is fully invalidated.
