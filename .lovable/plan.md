## What to do now

The backend and JSON credentials are working — token exchange succeeds. The remaining blocker is on the **Google Play Console** side: the service account is not yet authorized to read your app's catalog. This is a console configuration task, not a code task.

### Step 1 — Confirm the API is enabled (Google Cloud)
1. Open Google Cloud Console → project **nextcareer-500013**
2. APIs & Services → Library → search **Google Play Android Developer API**
3. Ensure it shows **API Enabled**. If not, click Enable and wait ~5 minutes.

### Step 2 — Link Google Cloud project to Play Console
This is the step most often missed and it produces the exact "migrate to the new publishing API" 403.
1. Play Console → **Setup → API access**
2. Under **Linked Google Cloud projects**, click **Link project**
3. Select **nextcareer-500013** and confirm

### Step 3 — Grant the service account app-level access
1. Still in Play Console → **Setup → API access**
2. Find service account **nextcareer-play-api@nextcareer-500013.iam.gserviceaccount.com**
3. Click **Manage Play Console permissions**
4. Under **App permissions**, click **Add app** → select **NextCareer** (com.smforge.nextcareer)
5. Grant these permissions on that app:
   - View app information and download bulk reports
   - View financial data, orders, and cancellation survey responses
   - Manage orders and subscriptions
6. Click **Invite user** / **Save changes**
7. Wait ~5 minutes for propagation

### Step 4 — Re-check in the app
Reopen the Upgrade screen in your installed Android build. The debug panel will re-run and should now show the catalog endpoints returning 200 instead of 403.

### If it still fails after Step 3
Send me a fresh screenshot of the debug panel and I'll investigate further (possible causes: app not yet published to any track, or a second Google Cloud project silently linked).

No code changes are required for any of this.
