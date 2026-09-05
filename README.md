# Cloudflare Pages demo: parameterized /start + HubSpot hidden fields

Static site, no build step. Proves four things:

1. `/start?agent=name&lo=name` shows a personalized page and populates two hidden HubSpot fields (`agent_slug`, `lo_slug`).
2. Missing or misspelled params fall back cleanly.
3. `_redirects` handles vanity links (302) and old URLs (301).
4. GA4 events fire on Apply, Text, Call, Book, and form submit, each carrying `agent` and `lo`.

## Before deploying

- The GA4 measurement ID (`G-8F7HH8QT96`) is set in `start/index.html` and `404.html`. For the real site, swap in the client's ID.
- In HubSpot: create two single-line text contact properties, `agent_slug` and `lo_slug`, then a form that includes both as hidden fields. The embed code goes in `start/index.html`: the `hs-form-frame` div inside `#hs-form`, and the script tag at the end of the body. The demo is wired to portal `246633875` on `na2`.
- The new HubSpot form editor renders the form in an iframe, so `main.js` sets the hidden fields through HubSpot's `HubspotFormsV4` client API on the `hs-form-event:on-ready` event, using the contact-prefixed property references `0-1/agent_slug` and `0-1/lo_slug`. The legacy inline embed (`hbspt.forms.create`) is still handled through the `hsFormCallback` message path.
- Edit `data/agents.json` to add agents and loan officers. Keys are lowercase slugs. The default LO's first name and phone are also hardcoded in the HTML as the no-JS fallback.
- `/assets/*` is served with a one-year immutable cache (see `_headers`). After editing `style.css` or `main.js`, bump the `?v=` on their references in the three HTML files or browsers keep the old copy.

## Local preview

```
npx wrangler@4 pages dev .
```

This emulates `_redirects`, `_headers`, and the 404 fallback at `http://127.0.0.1:8788`. Note that Pages answers `/start` with a 308 to `/start/` (query string preserved), so `/jane` resolves in two hops.

## Deploy

Cloudflare dashboard, Workers & Pages, Create, Pages, connect the repo. Build command: none. Output directory: `/`. Pushes to `main` deploy production; other branches get preview URLs.

## Test checklist

- [ ] `/start?agent=jane&lo=mike` shows Jane and Mike, hidden fields populated
- [ ] `/start?agent=jane` shows Jane and the default LO
- [ ] `/start?agent=nobody&lo=mike` shows generic copy, Mike, `agent_slug=nobody` in the form
- [ ] `/start` with no params shows generic copy and default LO
- [ ] `/start?agent=<script>alert(1)</script>` renders nothing dangerous and `agent_slug` is `scriptalert1script`
- [ ] `/jane` returns 302 to `/start?agent=jane&lo=mike` (`curl -I`)
- [ ] One old URL returns 301 with the correct Location (`curl -I`)
- [ ] `/nonexistent` returns the custom 404 with working CTAs
- [ ] Form submission creates a HubSpot contact with both slug properties set
- [ ] All five GA4 events appear in DebugView with `agent` and `lo` params
- [ ] iPhone Safari and Android Chrome: `sms:` and `tel:` links open the right apps
- [ ] Lighthouse mobile performance 95+
