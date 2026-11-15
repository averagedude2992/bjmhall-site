# BJM Hall website (bjmhall.org)

A simple, free-to-host static website for the BJM Hall in Hayward, CA.
Plain HTML + CSS + a tiny bit of JavaScript. No build step: upload the folder anywhere.

## Files

| File | What it is |
|---|---|
| `index.html` | Home: welcome, events calendar, event-alert signup |
| `rent.html` | Rent the Hall: event types, photos, hall details, map, rental request form |
| `events.ics` | 2026–2027 events as all-day calendar entries ("Add all events to my calendar" button) |
| `CNAME` | `bjmhall.org` (used by GitHub Pages; harmless on Cloudflare) |
| `_headers` | Cloudflare Pages: serves `events.ics` as a calendar download |
| `join/index.html` | Mobile-first signup + volunteer page for the QR code (bjmhall.org/join) |
| `css/style.css` | All styles, mobile-first (base = phones; `min-width` 480/768/960px enhance for larger screens). No JavaScript anywhere. |
| `qr/` | QR code to bjmhall.org/join: plain PNG, printable letter-size PNG and PDF |
| `images/` | Flags (SVG) and hall photos (`hall-NN-name.jpg`, resized to max 1600px) |

Preview locally: `python3 -m http.server 8000` in this folder, then open http://localhost:8000

## Placeholders to fill in

Search the files for `[` and `PLACEHOLDER` / `PASTE_` / `EXAMPLE` / `TO CONFIRM`:

- Contact info is filled in: 21160 Ocean View Dr, Hayward, CA 94541 · (510) 581-4034 · bjmhall@outlook.com (tap-to-call, tap-to-email, tap-for-directions buttons).
- **Home:** published Outlook calendar link (used twice: the phone "View full calendar" button and the tablet/desktop iframe); short hall history in "Our Roots"; the events flyer image (save as `images/bjm-events-flyer-2026-2027.jpg` and uncomment the "See the full flyer" button).
- **Rent page:** capacity `[number]`, what's included. Rates, payment options, and booking steps are filled in. Zelle is a placeholder until the hall's Zelle email or phone is added (search `ZELLE PLACEHOLDER` in `rent.html`).
- **Forms:** connected (Microsoft Forms, embedded + big full-screen button).

## Adding or changing photos

1. Resize to about 1600px wide (keeps the site fast) and save as JPG in `images/`.
2. In `rent.html`, inside `<div class="gallery">`, add or edit a `<figure>` (change `src`, `alt` description, and caption).
3. Hero backgrounds: `hall-01-main-hall.jpg` (home) and `hall-12-stage.jpg` (rent page), set in the `style=` on each page's first `<section>`.

## FORMS-SETUP (Microsoft Forms, free with the hall's Microsoft 365 nonprofit account)

The site has no form code of its own. Both forms are Microsoft Forms embedded in the pages.
Responses are saved to Excel and can email the hall inbox.

### Form 1: "Stay connected with BJM Hall" (Join / updates + volunteer)
Used on the home page (Get Event Alerts) and on `join/index.html` (QR code page).

Title: **Stay connected with BJM Hall** · Subtitle: *Bem-vindos! ¡Bienvenidos! Get news about our Portuguese events, and lend a hand if you can.*

| # | Question | Type | Required |
|---|---|---|---|
| 1 | Your name | Text | Yes |
| 2 | Mobile phone (for text messages) | Text (Restrictions: Number off; leave as text so dashes are OK) | No |
| 3 | Email | Text | No |
| 4 | How should we contact you? | Choice, multiple answers: "Text me about Portuguese events", "Email me about events" | Yes |
| 5 | I can help set up for events (hang lights, banners, flags, tables) | Choice: "Yes, count me in!", "Not right now" | No |
| 6 | Ways I can help (optional) | Text, long answer | No |
| 7 | How did you hear about us? | Choice: "Raffle / QR code", "Website", "Friend or family", "Other" | No |

Add to the description: "Please give a phone number or an email (or both). We only use this for BJM Hall news. Reply STOP to any text to stop."
(Microsoft Forms can't require "one of two fields", so the description asks for it.)

### Form 2: "BJM Hall Rental Request"
Used on `rent.html`.

| # | Question | Type | Required |
|---|---|---|---|
| 1 | Your name | Text | Yes |
| 2 | Phone | Text | Yes |
| 3 | Email | Text | Yes |
| 4 | Type of event | Choice: Wedding / Boda, Birthday / Cumpleaños, Quinceañera, Baptism / Bautizo, Church service / Servicio religioso, Anniversary / Aniversario, Other / Otro | Yes |
| 5 | Event date | Date | Yes |
| 6 | Second-choice date (optional) | Date | No |
| 7 | Number of guests | Text (Restrictions: Number) | Yes |
| 8 | Tell us about your event | Text, long answer | No |

Add to the description: "This is a request only. Your date is not reserved until the hall confirms with you."

### Settings for both forms
1. Sign in at https://forms.office.com with the hall's Microsoft 365 account → **New Form**, add the questions above.
2. **… (More form settings) → Settings**: set "Who can fill out this form" to **Anyone can respond**. Turn on **Get email notification of each response**.
3. **Responses → Open in Excel** to see all answers in a spreadsheet (saved in the hall's OneDrive).

### Get the embed code and link
1. In the form, click **Collect responses** (or **Share**).
2. Copy the **link** (looks like `https://forms.office.com/r/AbC123xyz`). Paste it in the page's big button: replace `PASTE_..._FORM_SHARE_LINK_HERE`.
3. Click the **Embed** icon `</>` and copy the code. From it, copy only the URL inside `src="..."`.
4. In the page, uncomment the `<iframe ...>` line (remove `<!--` and `-->`), replace `PASTE_..._FORM_EMBED_URL_HERE` with that URL, and delete the yellow PLACEHOLDER note.

Where to paste:
- Join form → `index.html` (Get Event Alerts section) and `join/index.html`.
- Rental form → `rent.html` (Request a Date section).

Texting subscribers needs a separate tool later (e.g. a group-text service or Square Marketing); the form just collects numbers and consent.

## Updating events

Events are listed by hand in `index.html` (section `id="events"`: one `<article class="featured-event">` for the next big event, then one `<li class="event">` per event) and in `events.ics`.
The featured New Year's Eve card has a commented-out flyer image slot: save the flyer as `images/nye-2026-flyer.jpg` (about 800-1200px wide) and uncomment the `<img>`.
When an event passes, delete its `<li>`. When a new season's flyer comes out, update both. Times are not shown until announced.

## QR code

`qr/bjmhall-join-qr.png` points to **https://bjmhall.org/join** (high error correction, tested). Print `qr/bjmhall-join-qr-printable.pdf` (letter size) for raffle tables.
It only works once the site is live on bjmhall.org.

## Connect the Outlook calendar

1. Sign in to Outlook on the web with the hall account.
2. Settings → Calendar → Shared calendars → **Publish a calendar**.
3. Choose the calendar, permission **Can view all details** (or "titles and locations"), click **Publish**.
4. Copy the **HTML** link.
5. In `index.html`, put the HTML link in the **View full calendar** button (shown on phones, where an embedded calendar is too cramped), and replace the placeholder inside `<div class="calendar-embed" ...>` (shown on tablets/desktops) with:
   ```html
   <iframe src="PASTE_HTML_LINK_HERE" title="BJM Hall events calendar" loading="lazy"></iframe>
   ```
   Only publish a calendar that contains public events (not private rental details).

## Deploy free on Cloudflare Pages

1. Create a free account at https://dash.cloudflare.com (use the hall email).
2. **Workers & Pages → Create → Pages → Upload assets** (Direct Upload).
   - Project name: `bjmhall` → upload this folder (or the zip). No build settings needed.
   - You get a free address like `https://bjmhall.pages.dev`.
   - (Optional) Instead, put this folder in a GitHub repo and choose **Connect to Git**; build command: none, output directory: `/`. Every change you push then goes live automatically.
3. To update later: Pages project → **Create new deployment** → upload the folder again.

## Point bjmhall.org (GoDaddy) at Cloudflare Pages

**Recommended: move DNS to Cloudflare (free).** Keep the domain registered at GoDaddy.

1. Cloudflare dashboard → **Add a domain** → `bjmhall.org` → Free plan.
2. Cloudflare imports your existing DNS records. The hall email is **bjmhall@outlook.com**, a personal Outlook.com account, so it does **not** use the bjmhall.org domain and there are no hall MX/email records to preserve (unless someone has set up @bjmhall.org email; if so, make sure the MX and TXT/SPF records are copied before switching).
3. Cloudflare shows two nameservers (e.g. `xxx.ns.cloudflare.com`).
4. GoDaddy → My Products → bjmhall.org → **DNS → Nameservers → Change → "I'll use my own nameservers"** → enter the two Cloudflare nameservers → Save.
5. Wait for Cloudflare to say the domain is **Active** (minutes to a few hours).
6. Pages project → **Custom domains → Set up a custom domain** → add `bjmhall.org`, then add `www.bjmhall.org`. Cloudflare creates the DNS records and the free HTTPS certificate automatically.
7. (Optional) Add a redirect rule so `www.bjmhall.org` → `https://bjmhall.org`.

**Alternative: keep DNS at GoDaddy.** Only `www` can be pointed directly:
- GoDaddy DNS → add **CNAME** `www` → `bjmhall.pages.dev`, then add `www.bjmhall.org` as a custom domain in Pages.
- For the bare `bjmhall.org`, use GoDaddy's **Forwarding** to `https://www.bjmhall.org`.

Remember: the domain itself still renews at GoDaddy (auto-renew on is recommended).

## Alternative: GitHub Pages

Push this folder to a public GitHub repo → Settings → Pages → Deploy from branch `main` / root.
The `CNAME` file (containing `bjmhall.org`) is already included. In GoDaddy DNS add A records for `@` to
185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 and a CNAME `www` → `<username>.github.io`.
