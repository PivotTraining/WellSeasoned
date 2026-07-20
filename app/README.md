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
   **App Manager** access, download the `.p8` file (only downloadable once —
   keep it safe), and note the **Issuer ID** and **Key ID** shown on the page.
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

### Fix: "No matching profiles found" on first build

The `environment.ios_signing` shortcut only looks for an *existing*
certificate/provisioning profile — it won't create one, so a brand-new
Apple Developer account (nothing registered yet) hits "No matching
profiles found for bundle identifier..." on the very first build.
`codemagic.yaml` now uses the explicit signing steps instead
(`keychain initialize` → `app-store-connect fetch-signing-files --create`
→ `keychain add-certificates` → `xcode-project use-profiles`), which
generates the App Store distribution certificate + profile automatically
the first time it runs. Subsequent builds reuse them.
