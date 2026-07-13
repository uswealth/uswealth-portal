# Go-Live Runbook — deploy the prototype to uswealth.fund
**Companion to** `../03_Deliverables/05_USWF_Portal_Deployment_Guide.md` (general guide). This is the
concrete, copy-paste version for *this* static prototype.

> ⚠️ **Compliance gate (M6/S22) — do this first.** This prototype is labeled *simulated / not
> production / not compliance-cleared*. Before it becomes the **public** face of a real fund, USWF
> Compliance must clear the visible copy and disclosures. **Recommended flow: deploy to a private/
> staging URL → compliance review → then repoint the domain.** Steps below are marked **[STAGING]**
> (safe now) vs **[PUBLIC]** (needs your GoDaddy DNS + compliance sign-off).

Site root to publish: **this `portal/` folder** (entry: `index.html`).

---

## Option A — GitHub Pages  (the `gh` CLI is already logged in as the `uswealth` account)

**[STAGING]** Publish to `https://<owner>.github.io/<repo>/` first (private-review friendly):
```bash
cd /Users/emukw/Desktop/MAS/VAULT/RPM-Agent-Framework/portal
git init && git add -A && git commit -m "USWF portal prototype"
gh repo create uswealth/uswealth-portal --private --source=. --push   # you run this
# In the repo: Settings → Pages → Deploy from branch → main → / (root)
```
The included `CNAME` file already contains `uswealth.fund`.

**[PUBLIC]** Point the domain (in **GoDaddy → DNS**, remove the park records, then add):
```
Type   Host   Value
A      @      185.199.108.153
A      @      185.199.109.153
A      @      185.199.110.153
A      @      185.199.111.153
CNAME  www    uswealth.github.io
```
Then GitHub → Settings → Pages → Custom domain = `uswealth.fund` → **Enforce HTTPS**.

## Option B — Netlify  (drag-and-drop, no CLI needed)
**[STAGING]** app.netlify.com → *Add new site → Deploy manually* → drag the `portal/` folder →
you get a `*.netlify.app` URL. (`netlify.toml` here sets publish + security headers.)
**[PUBLIC]** Netlify → Domain settings → add `uswealth.fund`; in **GoDaddy DNS**:
```
A      @      75.2.60.5
CNAME  www    <your-site>.netlify.app
```
Netlify auto-provisions TLS.

## Option C — Vercel
**[STAGING]** vercel.com → New Project → import repo / upload → `*.vercel.app` URL.
**[PUBLIC]** Add `uswealth.fund`; in **GoDaddy DNS**:
```
A      @      76.76.21.21
CNAME  www    cname.vercel-dns.com
```

---

## Email — admin@uswealth.fund  (independent of the site host)
In your email provider (e.g., Google Workspace/Fastmail), add `uswealth.fund`, then in **GoDaddy DNS**
add the provider's **MX** records plus **SPF (TXT)**, **DKIM**, and **DMARC**. Send/receive a test.

## Go-live checklist
- [ ] Staging URL reviewed; **M6 cleared** the copy + disclosures.
- [ ] GoDaddy park records removed; A/CNAME point to the chosen host.
- [ ] Valid TLS (HTTPS enforced); `www` redirects to apex.
- [ ] admin@uswealth.fund sends/receives (SPF/DKIM/DMARC pass).
- [ ] Every page still shows the "simulated / not investment advice" disclosures.
- [ ] Announce.

## What I (Claude) cannot do for you
- Log into your **GoDaddy** account or change DNS — interactive, your credentials.
- Run `gh repo create` / hosting deploys that **publish externally** without your explicit go-ahead.
Run the interactive commands yourself; in this session you can prefix a command with `!` to run it
here (e.g. `! gh repo create ...`) so its output lands in the conversation.
