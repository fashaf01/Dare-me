# Dareme

A first working web app for thoughtful daily dares, friendship, and dating. Built with React, TypeScript, Vite, Express, and SQLite, with a responsive desktop and mobile interface.

## Run locally

Requires **Node.js 24 or newer** and npm. No external database or API keys are required.

```sh
cd /workspace/Dare-me
npm ci
npm run dev
```

Vite runs on port **5173** and proxies `/api` to the server on port **3001**. Keep both processes running; `npm run dev` starts them together. The server health check is `GET /api/health`.

The first visit creates an isolated interactive preview. Sample people, their badges, and their posts are fictional. Use **Interactive preview → Create an account** to create a real local account, or sign into an existing one. Preview content does not migrate into registered accounts.

## What works

- **Two reviewed online dares per UTC day.** This MVP uses two fixed reviewed activities; daily availability resets at 00:00 UTC. Accepting, completing, or leaving is stored on the server. Leaving allows another attempt at the same activity, without adding a third daily assignment.
- **Mutual consent.** The invited partner must separately accept the rules. Chat stays locked until then. Preview accounts have an explicitly labeled sample-acceptance action; it cannot be used for real accounts.
- **Verified-only matching and friendship/dating preferences.** Both partners’ filters are checked by the server. New accounts cannot grant themselves verification. Because a verification provider is not connected, new accounts may have no eligible matches while verified-only filtering is on. Two unverified accounts can match only when both opt out of that filter and their intentions agree.
- **Private accounts by default.** Name, avatar, and bio remain discoverable. Posts and uploaded photos require approved following when private. Dare acceptance never unlocks private posts. Making an account public requires an explicit confirmation.
- **Photo posts, likes, comments, following, and a saved collection.** Photos are limited to JPEG, PNG, and WebP, decoded and re-encoded on the server, bounded in size, and stripped of metadata. Uploaded images are served through access-checked API routes. Saved collections remain on the current browser/device.
- **Text chat, leaving, and dare completion.** Chat polls for new messages. Completed chats are read-only. Blocking immediately ends matches and revokes access to profiles, posts, images, and conversations in both directions.
- **Reports and a safety center.** Reports are stored privately with reference numbers. The UI clearly explains that this prototype does not have a staffed moderation team.
- **Registration and sign-in.** Scrypt-hashed passwords, server-side sessions stored as token hashes, HttpOnly/SameSite cookies, same-origin write checks, request limits, input validation, and authorization checks. Email and password hashes are never exposed through member profiles.

## Validation

```sh
npm test          # API integration tests using a fresh temporary database
npm run build    # TypeScript checks and production bundle
npm audit        # dependency advisory check
```

Optional full browser smoke test, when Python Playwright and Chromium are installed:

```sh
python3 tests/ui_smoke.py
```

Run the development server first. `APP_URL` and `CHROMIUM_PATH` can override the browser test’s app URL and Chromium executable. The test uses new preview sessions and verifies consent, messaging, image uploads, privacy persistence, reporting, blocking, and desktop/mobile navigation. It saves screenshots under `/tmp`.

## Storage and production

Data lives in the ignored `.data/` directory: `dareme.sqlite` and an `uploads/` folder. Back up both together. `DATA_DIR` can point to another persistent directory. `PORT` changes the API/production server port (default 3001); development Vite expects 3001 unless its proxy target is updated.

```sh
npm run build
npm start
```

Production serves the built React app and API from one server. It uses **Secure cookies**, so deploy behind HTTPS with a reverse proxy that preserves the original `Host` and `Origin` headers. Browser sessions will not work on a plain HTTP public deployment. Behind a trusted hosting proxy, set `TRUST_PROXY_HOPS` to its verified hop count (1 in the Railway configuration); keep the default 0 when serving directly. This allows per-client rate limiting without trusting arbitrary forwarded headers. Verify the proxy topology on the deployed host before inviting users.

### Deploy from GitHub

GitHub hosts this source code. **GitHub Pages cannot run the Node API, SQLite, private media, or real account/chat features.** The complete app requires a Node web service with persistent storage.

Railway is the selected host. `.railway/railway.ts` uses Railway's current official infrastructure SDK to define a single Node service, a 1 GB persistent volume, daily volume backups, HTTPS-ready cookies, and an API health check. **Compute, storage, and backups can incur charges.** This is a typed deployment specification, not proof of an applied or running service. Railway's IaC SDK is currently beta; the lockfile pins the installed SDK version.

1. Push this project to GitHub and connect `fashaf01/Dare-me` to your Railway account. The source requires a successful GitHub check suite before deployment.
2. Use Railway CLI **5.42.1 or newer**, authenticated to your Railway workspace. An account/workspace API token can be provided securely as `RAILWAY_API_TOKEN`; never commit it, paste it into chat, or pass its literal value on a command line.
3. Create/link a **new, empty** Railway project. Do not apply this whole-project specification to an existing project with other services: omitted infrastructure can be deleted by a whole-project apply. Inspect `railway config plan` before applying it with `railway config apply`. No apply has been performed merely by adding this file.
4. Keep the `dareme-data` volume mounted at `/data`, with `DATA_DIR=/data/dareme`. The service declares a required mount path and one replica. Never put account data on an ephemeral filesystem or scale SQLite across multiple instances.
5. Deploy the reviewed commit and wait for `/api/health` to pass. Generate the public HTTPS domain for the `dareme` service on port 3001 using Railway's Networking settings or `railway domain --service dareme --port 3001`. Use the URL **returned by Railway**, not a guessed hostname.
6. Test registration, private photos, and mutual-consent chat with test accounts through that HTTPS domain. Test persistence across a restart and backup restoration before inviting real users. Complete the launch prerequisites below.

The GitHub Actions workflow checks the API tests, production build, and runtime dependency audit. A green CI result validates code; it does not mean a website has been deployed.

### Before inviting the public

This is a development MVP, not a claim of production safety. Age confirmation is self-declared, and badges exist only for fictional preview accounts. Connect an independent identity/age verification provider; do not collect identity documents in posts or chat. Add verified email, password recovery, human moderation and escalation, image/content review, operational monitoring, account deletion/data retention policies, and privacy/legal review for the intended launch region. The report table is not an emergency response or staffed moderation service. Do not present it as one.

Private access controls cannot prevent a recipient from taking a screenshot. Chat is stored in the database, not end-to-end encrypted. Real accounts and their uploads require proper infrastructure, backups, and access-controlled operations.

## Assets

The interface illustrations are original inline SVGs. Demo photos come from Start Bootstrap’s [Agency](https://github.com/StartBootstrap/startbootstrap-agency), [Grayscale](https://github.com/StartBootstrap/startbootstrap-grayscale), and [Creative](https://github.com/StartBootstrap/startbootstrap-creative) example themes; see `public/images/SOURCE.md`. Fonts are Manrope and Instrument Serif from Google Fonts, licensed under the SIL Open Font License, included with the font files.
