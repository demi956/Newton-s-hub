# Putting Newton's Hub on Google Play

Newton's Hub is now an installable web app (PWA): it has a manifest, app icons, a service worker
and an offline screen. Google Play accepts PWAs packaged as a **Trusted Web Activity (TWA)** — a
thin Android app that opens the live site full-screen with no browser bar. Every website update
appears in the app instantly; you only re-upload to Play when the icon, name or package changes.

## Before you start

1. The site must be live on its final address (the Vercel URL or a custom domain). Changing the
   domain later means a new app release, so pick the domain first if you plan to buy one.
2. A Google Play Console developer account (one-time US$25).
3. Check the site passes the install checks: open it in Chrome on Android → menu → you should see
   **Install app**. In desktop Chrome, DevTools → Application → Manifest shows any problems.

## Build the Android package (no Android Studio needed)

1. Go to <https://www.pwabuilder.com>, enter the site URL, and choose **Package for stores →
   Android**.
2. Settings:
   - **Package ID:** e.g. `com.newtonshub.app` (permanent; cannot change after publishing)
   - **App name:** Newton's Hub · **Short name:** Newton's Hub
   - **Theme / background colour:** `#050e17`
   - **Signing key:** let PWABuilder create one. **Download and back up the key file and its
     passwords somewhere safe** — losing them means you can never update the app.
3. Download the zip. It contains the `.aab` (upload to Play) and an `assetlinks.json` file.

## Prove the app and the website belong together

So the app opens without a browser address bar, the site must publish the app's fingerprint:

1. Copy the generated `assetlinks.json` to `public/.well-known/assetlinks.json` in this repo.
2. After you enable **Play App Signing** in Play Console, also add Google's SHA-256 fingerprint
   (Play Console → your app → Setup → App signing) to the `sha256_cert_fingerprints` list.
3. Deploy, then check `https://YOUR-DOMAIN/.well-known/assetlinks.json` opens in a browser.

## Store listing checklist

- App icon 512×512: `public/icons/icon-512.png`
- Feature graphic 1024×500 (make one from `src/assets/newtons-hub-logo.png`)
- 2–8 phone screenshots (shop, product page, data bundles, Newton's AI chat, sell/swap)
- Short description (80 chars) and full description
- Privacy policy URL — Play requires one because the app has accounts. Add a `/privacy` page
  before submitting.
- Content rating questionnaire and Data safety form (the app collects name, email, phone and
  order details for accounts and orders).
- New personal developer accounts must run a **closed test with at least 12 testers for 14
  days** before the app can go to production. Recruit testers early (friends, UMaT students).
