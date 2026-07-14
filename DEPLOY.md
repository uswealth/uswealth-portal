# Go-Live Runbook — deploy the prototype to uswealth.fund
**Companion to** `../03_Deliverables/05_USWF_Portal_Deployment_Guide.md` (general guide). This is the
concrete, copy-paste version for *this* static prototype.

---

## ✅ CURRENT STATE — LIVE (as of the go-live below)

**The site is deployed and public at → https://uswealth.fund** (hosted on GitHub Pages, repo
`uswealth/uswealth-portal`, branch `master`, root `/`).

| Item | State |
|------|-------|
| Host | GitHub Pages (`uswealth/uswealth-portal`) |
| Custom domain (Pages) | `uswealth.fund` bound · `CNAME` file present on remote |
| TLS certificate | `approved` · **HTTPS enforced** |
| `https://uswealth.fund` | HTTP/2 **200** (marketing site) |
| `https://uswealth.fund/app.html` · `/eligibility.html` | 200 (portal demo · eligibility gate) |
| `www.uswealth.fund` | **301 → https://uswealth.fund/** |
| Email `admin@uswealth.fund` | **Proton Mail — preserved, untouched** |
| GoDaddy park page | removed |

### The exact live DNS records (GoDaddy → uswealth.fund)
```
Type   Name  Value                     Note
A      @     185.199.108.153           GitHub Pages  (each IP is its OWN record row)
A      @     185.199.109.153           GitHub Pages
A      @     185.199.110.153           GitHub Pages
A      @     185.199.111.153           GitHub Pages
CNAME  www   uswealth.github.io        edited the pre-existing "www → uswealth.fund" record
NS     @     ns37.domaincontrol.com    GoDaddy nameserver — KEEP (do not delete)
NS     @     ns38.domaincontrol.com    GoDaddy nameserver — KEEP (do not delete)
MX     @     mail.protonmail.ch (10)   email — KEEP
MX     @     mailsec.protonmail.ch (20) email — KEEP
CNAME  protonmail._domainkey   …proton.ch   DKIM — KEEP
CNAME  protonmail2._domainkey  …proton.ch   DKIM — KEEP
CNAME  protonmail3._domainkey  …proton.ch   DKIM — KEEP
CNAME  pay   paylinks.commerce.godaddy.com  GoDaddy pay-links — harmless, KEEP
TXT    @     (SPF / DMARC for Proton)  email auth — KEEP
```
> ⚠️ **Do not disturb the Proton email records** (`MX`, `protonmail*._domainkey`, SPF/DMARC `TXT`) or
> the `NS` records. Only the four `@` `A` records and the `www` `CNAME` are the website.

### How it was bound (GitHub side, via gh)
```bash
gh api -X PUT repos/uswealth/uswealth-portal/pages -f cname='uswealth.fund'   # sets domain + CNAME file
# wait for cert -> state "approved", then:
gh api -X PUT repos/uswealth/uswealth-portal/pages -F https_enforced=true
```

### To update the live site later
Edit files in `portal/`, then `git commit && git push origin master` — GitHub Pages redeploys
automatically (~1–2 min). The `CNAME` (custom domain) persists across pushes.

> ⚠️ **Open compliance item (post-launch).** The site went public **ahead of securities-counsel
> sign-off** at the investor's explicit direction (see `../03_Deliverables/09_...md`). Still to
> close: counsel to confirm the offering posture (Reg D 506(b) vs 506(c)) and finalize the
> eligibility-gate NDA/attestation wording. The site currently carries "prototype / simulated data"
> labels.

---

## Original runbook (for reference / re-deploy elsewhere)

> ⚠️ **Compliance gate (M6/S22).** This prototype is labeled *simulated*. Before it is the **public**
> face of a real fund, Compliance should clear the visible copy. Steps are marked **[STAGING]** vs
> **[PUBLIC]**.

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
