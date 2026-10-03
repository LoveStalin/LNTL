# LNTL multiplayer foundation

This is an isolated first milestone for LNTL. It does **not** rewrite `script.js` or change the existing single-player gameplay.

## Included

- Cloudflare Worker API to create six-character room codes.
- One SQLite-backed Durable Object per room.
- WebSocket lobby connections, guest nicknames, host assignment, ready state, disconnect handling, and a hard limit of 12 concurrent players.
- `../multiplayer-test.html`, a separate browser test page.

This milestone is a lobby prototype, **not yet authoritative FPS gameplay**. Position validation, server-side movement/collision, weapon validation, hit detection, health, respawns, and score are future milestones.

## Deploy the backend

Requirements: a Cloudflare account and Node.js/npm.

From this directory:

```bash
npx wrangler login
npx wrangler deploy
```

Wrangler will print the deployed Worker URL, typically:

```
https://lntl-multiplayer.<your-account-subdomain>.workers.dev
```

No API token or secret belongs in the frontend. Do not commit account credentials.

## Test the lobby

1. Open `multiplayer-test.html` locally, or deploy it with the static Pages site.
2. Paste the deployed Worker URL into **Backend Worker URL**.
3. Enter a nickname and click **Tạo phòng mới**.
4. Open the test page in a second browser tab/device.
5. Paste the same Worker URL, enter a different nickname and the room code, then click **Tham gia phòng**.
6. Toggle ready state in either tab and confirm both lists update.
7. Try a random nonexistent room code and confirm the server rejects it.
8. Repeat with separate tabs until 12 players are connected; a 13th connection should be rejected.

The backend accepts browser requests from any origin in this prototype so a Pages preview domain can reach it. Before a public launch, restrict allowed origins to the actual production and preview domains and add rate limiting / abuse controls.

## Local development

Run from this directory:

```bash
npx wrangler dev
```

Use the local URL printed by Wrangler as the backend URL in the test page. For HTTPS Pages sites, use the deployed HTTPS Worker URL for cross-device testing.

## Cloudflare configuration

`wrangler.jsonc` defines the `ROOMS` binding and the initial SQLite Durable Object migration. Deploy this Worker separately from the static Cloudflare Pages project. The game frontend remains hosted on Pages.
