# Well Seasoned — native app wrapper

This folder packages the live site (itswellseasoned.com) as a real iOS app via
[Capacitor](https://capacitorjs.com). It's intentionally isolated from the main
site — `index.html` stays a zero-build single file; this only wraps it for the
App Store.

**How it works:** the native app's webview points at `https://itswellseasoned.com`
(see `capacitor.config.json` → `server.url`). There's no bundled copy of the
site to keep in sync — every push to the site's branch is what the app shows,
automatically, with zero app-store resubmission needed for content changes.
`www/index.html` is just a brief branded loading placeholder shown for an
instant before the remote page paints (or if the device is offline).

Bundle ID: `com.wellseasoned.app` — must match what's registered in your Apple
Developer account and the "Well Seasoned" app record in App Store Connect.

## One-time setup (on a Mac, not done here)

This sandboxed environment has no macOS/Xcode/CocoaPods, so the following
hasn't been run yet — do this on your Mac:

```bash
cd app
npm install          # installs the Capacitor packages (this WAS run here, but
                      # node_modules isn't committed — same as any repo)
npx cap sync ios      # installs CocoaPods deps into ios/App/Pods
npx cap open ios      # opens the project in Xcode
```

## In Xcode

1. Select the **App** target → **Signing & Capabilities**:
   - Team: pick your Apple Developer team.
   - Make sure **Push Notifications** capability is present (should already be
     there — it's declared in `App.entitlements` conventions via the
     `@capacitor/push-notifications` plugin; if Xcode doesn't show it, add it
     with the `+ Capability` button).
2. Confirm **Bundle Identifier** reads `com.wellseasoned.app` under General.
3. Plug in an iPhone (or use a Simulator) and hit **Run** to sanity-check it
   loads the live site inside the app shell.
4. When ready to ship: **Product → Archive**, then **Distribute App → App
   Store Connect** to upload a build. It'll show up in App Store Connect
   under the "Well Seasoned" app record within a few minutes, ready to attach
   to a TestFlight build or a version for review.

## Why a "wrapped website" isn't a rejection here

Apple's App Review Guideline 4.2 flags apps that are just a website in a
frame with no native value. Two things here are real, working native
capability, not just window dressing:

- **Push notifications** are wired end-to-end — the native side
  (`AppDelegate.swift`) forwards APNs callbacks to the
  `@capacitor/push-notifications` plugin, and the web layer (`index.html`,
  search for "Native app shell (Capacitor) detection") requests permission
  and registers for real the moment it detects it's running inside the app
  shell (`window.Capacitor.isNativePlatform()`).
- The app **feels native**: full-screen, its own launch screen, no browser
  chrome, its own icon, offline handling via the same service worker the PWA
  already uses.

**Still open, deliberately not built without your sign-off** (a backend
change, same risk tier as any other Supabase schema change in this repo):
actually *sending* push notifications needs a place to store device tokens
(a small `device_tokens` table) and a send pipeline (new-verdict alerts,
"today's Card Check is up," etc.). The client-side registration above is
real and ready — it just isn't wired to a campaign yet. Say the word and
that's a small, contained follow-up.

## Icons & splash

Generated from the real brand salt-shaker mark via `gen_native_assets.js`
(same house style as the PWA icons in `/brand`). Re-run it any time the mark
changes:

```bash
node gen_native_assets.js
```

## Android (not started)

The same wrapper works for Google Play with `npx cap add android` — holding
off until there's a Google Play Developer account ($25 one-time) to attach it
to. Say the word and it's the same process as iOS above.

## Cloud build (no local Xcode / disk space needed)

If your Mac can't spare the ~15–40GB Xcode needs, `codemagic.yaml` (repo root)
is a ready-to-go [Codemagic](https://codemagic.io) config that builds this
exact `app/` project on a cloud Mac and uploads straight to TestFlight — no
local Xcode, CocoaPods, or disk space required. Setup (all done at
codemagic.io / appstoreconnect.apple.com in a browser, no terminal):

1. **Create an App Store Connect API key** — App Store Connect → **Users and
   Access → Integrations → App Store Connect API** → **+** → name it, give it
   **Admin** access (see the note below — App Manager is NOT enough for this
   setup), download the `.p8` file (only downloadable once — keep it safe),
   and note the **Issuer ID** and **Key ID** shown on the page.
2. **Sign up at codemagic.io** and connect this GitHub repo
   (`PivotTraining/WellSeasoned`) as an app.
3. In Codemagic → **Team settings → Integrations → Developer Portal → Manage
   keys** → add the API key from step 1, and name it `well_seasoned_asc`
   (or update the `integrations.app_store_connect` line in `codemagic.yaml`
   to whatever name you give it).
4. Back on the app page in Codemagic, select the **`ios-workflow`** and
   **Start new build**. It'll install dependencies, build, sign, and push a
   build to TestFlight automatically.
5. Check **App Store Connect → TestFlight** in a few minutes — the build
   should appear there, ready to install via the TestFlight app or submit
   for review.

### Troubleshooting, in the order you're likely to hit them

**1. "No matching profiles found for bundle identifier ... and distribution
type 'app_store'"**

The `environment.ios_signing` shortcut only looks for an *existing*
certificate/provisioning profile — it won't create one, so a brand-new
Apple Developer account (nothing registered yet) hits this on the very
first build. Fixed already: `codemagic.yaml` uses the explicit signing
steps instead (`keychain initialize` → `app-store-connect
fetch-signing-files --create` → `keychain add-certificates` →
`xcode-project use-profiles`), which generates the App Store distribution
certificate + profile automatically the first time it runs. Subsequent
builds reuse them — this step only does real work once.

**2. The API key needs Admin, not App Manager**

This is the one most likely to bite next if the key was created with
**App Manager** access (which is what a lot of guides — including an
earlier version of this one — suggest for a simpler "upload-only" setup).
**Creating a NEW certificate/profile requires Admin access** on the API
key; App Manager can only use signing files that already exist. Since our
`fetch-signing-files --create` step needs to create them the first time,
an App Manager key will fail (often with a permissions/403-style error
from the `app-store-connect` step, sometimes worded as if the resource
"doesn't exist" rather than a clear permissions message — easy to
mistake for the profile error above).

Fix: Apple doesn't allow changing a key's role after creation, so —
1. App Store Connect → **Users and Access → Integrations → App Store
   Connect API** → find the key → **Revoke** it.
2. Create a **new** key with **Admin** access, download its `.p8` file
   immediately.
3. In Codemagic → **Team settings → Integrations → Developer Portal →
   Manage keys**, add the new key (same name, `well_seasoned_asc`, or
   update the value in `codemagic.yaml` to match) — this replaces the old
   one, no other config changes needed.
4. Re-run the build.

**3. Missing export compliance (blocks the build from becoming testable
in TestFlight)**

Apple asks every app whether it uses encryption subject to U.S. export
documentation. Left unanswered, a build uploads fine but sits in App
Store Connect unable to be added to a TestFlight test group until someone
manually answers the question in the UI. Already fixed proactively:
`app/ios/App/App/Info.plist` now declares
`ITSAppUsesNonExemptEncryption: false` (accurate — the app only uses
standard HTTPS via the webview and Capacitor's own plugin traffic, no
custom encryption), which answers the question at build time and skips
the manual step entirely.

**4. "This build number has already been used"**

Apple requires every TestFlight/App Store upload to have a build number
higher than the last one, even across failed attempts. Already handled:
`codemagic.yaml` auto-increments the build number every run using
Codemagic's own build counter (`agvtool new-version -all $BUILD_NUMBER`)
— no manual bumping needed, and reruns can never collide.

**5. Build times out**

First run creates a certificate/profile from scratch and starts from a
cold CocoaPods cache, so it can legitimately take longer than a typical
rebuild. `max_build_duration` is set to 90 minutes to give it room —
if it still times out, that's likely a real hang (check the log for which
step it stalled on) rather than needing more time.

**6. The App ID was never fully registered**

If the "Register an App ID" flow in the Apple Developer portal was
started but not finished (no final **Continue → Register** click), there's
nothing in Certificates, Identifiers & Profiles for Codemagic to attach a
profile to — same symptom as #1. Check **Apple Developer → Certificates,
Identifiers & Profiles → Identifiers** and confirm `com.wellseasoned.app`
is actually listed there.
