# Deployment Guide — Visitor Intelligence & Lead System Upgrade

This upgrade adds server-side tracking, lead scoring, booking persistence,
a daily email report, and an admin dashboard on top of your existing site
— without changing how it looks or removing anything that worked before.

**Read this whole document before deploying.** A few things need to be
configured in Netlify before the new features actually do anything; the
site itself works perfectly with none of them configured (see "Failure
tolerance" below).

---

## 1. What changed

- `index.html` — same site, same look. Added: visitor/session tracking
  calls at key interaction points, a privacy notice (linked in the
  footer), and the Book Now flow now attempts to save your booking
  server-side before opening WhatsApp (falling back to the exact
  original behavior if that fails — see section 6).
- `app.js` — kept in sync with the script embedded in `index.html`, but
  **not actually loaded by the page** (this was already true before
  this upgrade — `index.html` is self-contained). Edit `index.html`
  directly for any future JS changes; `app.js` is a readable reference
  copy only.
- `netlify.toml` — now declares the functions directory and the daily
  report's schedule.
- `netlify/functions/` — new. This is the backend, kept deliberately
  flat (no subfolders) so it's simple to upload:
  - `api.js` — ONE combined function handling tracking, leads,
    bookings, and the admin dashboard, routed by a `?action=` query
    parameter (`track` / `lead` / `booking` / `admin`). Internally
    it's organized the same way as separate modules always were —
    the sections are clearly labeled — it's just packaged as one
    file instead of many.
  - `daily-report.js` — the scheduled function that emails your daily
    report. Kept separate because it runs on its own timer, not via
    the website.
  - `package.json` — declares the one dependency (`@netlify/blobs`)
    Netlify needs to install automatically.

  Every function behaves identically to a more "properly" split-up
  version — same logic, same tests — this is just the simplest
  possible file layout to upload.

## 2. Required environment variables

Set these in **Netlify → Site settings → Environment variables**. None
of them are in the code or the repo.

| Variable | Required for | Example |
|---|---|---|
| `OWNER_WHATSAPP_NUMBER` | Booking notification link | `919011101654` |
| `EMAIL_API_KEY` | Daily report email | your Resend API key |
| `REPORT_EMAIL_TO` | Daily report email | `you@example.com` |
| `REPORT_EMAIL_FROM` | Daily report email | `reports@yourdomain.com` (must be a domain verified in Resend) |
| `ADMIN_ACCESS_TOKEN` | Admin dashboard | any long random string — this IS your dashboard's password, generate it properly (e.g. `openssl rand -hex 24`) |
| `REPORT_TIMEZONE_OFFSET_MINUTES` | Optional | `330` for IST (this is the default if unset) |

**If you skip all of these:** the site still works exactly as before.
Tracking calls fail silently (nothing breaks, nothing is recorded).
Bookings fall back to the original client-only WhatsApp message. The
daily report function will run on schedule but skip sending (logged,
not silent-fails-you-into-thinking-it-worked). The admin dashboard
returns a clear "not configured" message instead of a fake unlocked
page.

## 3. Enabling Netlify Blobs

Netlify Blobs is enabled automatically for sites on Netlify — no
separate signup. If your account predates Blobs' general availability,
check **Site settings → Blobs** and enable it if you see a toggle.
Nothing else to configure; the functions create their stores on first
write.

## 4. Email provider (Resend)

The email module (the `sendEmail` section inside `netlify/functions/daily-report.js`) is written
against [Resend](https://resend.com)'s API — sign up, verify a sending
domain (or use their test address while you're setting things up), and
put the API key in `EMAIL_API_KEY`. If you'd rather use a different
provider, only `sendEmail()` in that one file needs to change — nothing
else in the project talks to Resend directly.

## 5. The admin dashboard's security model — please read this

There is no username/password login. Instead, the dashboard is a
Netlify Function that checks a secret token against the
`ADMIN_ACCESS_TOKEN` environment variable, entirely server-side. You
reach it at:

```
https://yoursite.com/admin?token=YOUR_ADMIN_ACCESS_TOKEN
```

**What this protects against:** casual visitors, search engines
(the page sends `noindex`), and anyone who doesn't have the exact link.

**What this does NOT protect against:** anyone who obtains that exact
URL (browser history on a shared device, a screenshot, it being
pasted somewhere) can view the dashboard until you change the token.
There's no rate limiting, no login log, no expiry.

Treat the link itself as a password. If you ever need stronger
security (multiple staff members, audit logs, etc.), that's a genuine
authentication system (Netlify Identity or similar) — a bigger change,
intentionally not built here per the instruction not to fake security
that isn't real.

## 6. Why bookings never depend on the backend

`submitBookNow()` in `app.js` tries to save the booking server-side
first (which also generates a booking ID and a richer WhatsApp message
for you, with the lead's score and source attached). But it races that
against a 2-second timeout, and if the backend doesn't answer in time
— not deployed yet, Blobs misconfigured, function cold-starting,
whatever — it falls back to **the exact WhatsApp message the site
already sent before this upgrade**. I tested all three paths
explicitly (backend succeeds / backend times out / backend responds
with an error) — booking always completes either way.

## 7. What I verified myself vs. what you need to verify

I built and ran this in a sandboxed environment with **no network
access** — I could not install the Netlify CLI, hit a live Blobs
store, send a real email, or confirm the scheduled function actually
fires on Netlify's infrastructure. Here's the honest split:

**Verified by me (automated tests, included in the build process):**
- Every pure-logic module (scoring, sanitization, WhatsApp message
  building, UA parsing, timezone/day-boundary math, report
  aggregation) — unit tested directly, including an actual XSS
  payload to confirm it gets escaped, not executed.
- Every action's handler logic (track, lead, booking, admin, and the
  separate daily-report function) — tested
  end-to-end against an in-memory mock that implements the same
  interface as `@netlify/blobs`. This proves the logic is correct;
  it does not prove Netlify's actual Blobs service behaves
  identically to my mock.
- Duplicate-booking prevention, auth gating on the admin dashboard,
  and the full existing site (wizard, Book Now, calculators,
  service modals) — all still pass after every change.

**You need to verify after deploying (I cannot do this for you):**
- [ ] Submit a real test booking → confirm it appears if you check
      Blobs (or just confirm the WhatsApp message opens correctly)
- [ ] Visit `/admin?token=...` → confirm the dashboard loads and
      shows your test booking
- [ ] Manually trigger the daily report once to confirm email
      delivery: visit `/.netlify/functions/daily-report?date=YYYY-MM-DD`
      (use today's date) and check your inbox, and check the function
      logs in Netlify for any error
- [ ] Wait for the actual 11:59 PM IST scheduled run once, and check
      it fired (Netlify's function logs show invocation history)
- [ ] Click through the site once on real Android Chrome and iPhone
      Safari after deploying, since I can only test JS logic, not
      actual rendering/touch behavior

## 8. Rolling back

Every change here is additive at the architecture level — the
frontend still works with zero backend configured. If something
goes wrong, you can delete the `netlify/functions/` directory and
revert `netlify.toml`'s functions/schedule lines, and the site
returns to exactly its pre-upgrade behavior.
