# uswealth.fund — Portal Build (working prototype)
**Owner:** M7 Portal Platform & Product Engineering Manager · Built by S25–S29
**Status:** Runnable front-end prototype · **Data: simulated/illustrative — not live, no real orders**

This is the **investor-facing portal that benchmarks and replaces the PowerOptions site**, built to
the specs in the RPM Agent Framework (M7) and the launch content in
`../03_Deliverables/04_USWF_Portal_Content.md`. It runs as a dependency-free static site and
implements the **real RAT math** from the source docs (`rat.js`), so the numbers on screen are
computed, not mocked.

---

## Run it

No build step, no dependencies. From this `portal/` folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html   (marketing site)
#          http://localhost:8000/app.html       (investor portal)
```

(Or just open `index.html` directly in a browser — the portal works from `file://` too.)

---

## What's here

```
portal/
├── index.html            Marketing site — announcement, "how it works", for-institutions, disclosures
├── app.html              Investor portal shell (loads the four surfaces)
├── README.md             This file
└── assets/
    ├── css/styles.css    Institutional-finance styling (dependency-free)
    └── js/
        ├── rat.js        ★ The RAT engine — faithful RPM math (see below)
        ├── data.js       Seed candidates (RadioActive screen) + the two IPS portfolios
        ├── charts.js     SVG "hockey-stick" payoff chart
        └── app.js        Portal surfaces + hash router
```

## The RAT engine (`rat.js`) — verified

Encodes the source-doc math directly:
- **RPM economics** — `Total Invested = (stock + put) × 100N`, `Guaranteed = strike × 100N`,
  `At-Risk = Total Invested − Guaranteed`. *(The reference Home RPM computes to exactly
  $5,000 / $4,750 / $250 = 5.0% — matching Deliverable 02.)*
- **Trade Gate** — CEGA (Cost·Exposure·Gap·Acceptability) + Catastrophe Report; **GREEN** ≤6%,
  **CAUTION** 6–9%, **BLOCKED** >9% (the 4–6% target, 9% hard cap).
- **IM#1** covered call/collar — **rejects any call struck below the protective put** (the
  framework's cardinal rule), collects premium, lowers at-risk.
- **IM#4** roll-the-put-up — the "ATM" deposit that raises the guaranteed floor and flips a
  position to **BULLETPROOF** (negative at-risk).
- **Payoff curve** — expiration P&L including the covered-call cap.

## PowerOptions → uswealth.fund parity

| PowerOptions workflow | Portal surface | Status in prototype |
|---|---|---|
| RadioActive Married-Put Search (Sort by EPSG) | **Discover** (`#/discover`) | ✅ live table, EPSG-sorted, at-risk computed |
| Risk/reward hockey-stick graph | **Position graph** | ✅ SVG on Trade ticket & Manage RPM |
| My Portfolio / Add to Portfolio | **My Portfolios** (`#/portfolios`) | ✅ two IPS portfolios, goal status |
| Profit/Loss Portfolio | **Portfolio mark / goal status** | ✅ value, gap, at-risk of capital |
| Position Analysis / Roll-Out | **Manage RPM** (`#/manage`) | ✅ IM#1 & IM#4 what-ifs, bulletproof flag |
| Trade Comparison / broker connect | **Trade ticket** (`#/trade`) | ✅ CEGA/Catastrophe gate → "open RPM" |

## Try this (2-minute tour)
1. **Discover** → see EPSG-sorted candidates with live at-risk badges → click **Build RPM ▸**.
2. **Trade ticket** → pick a portfolio & contracts → read the **Trade Gate** verdict → **Approve & open**.
3. **Manage RPM** → apply **IM#1** (try a call *below* the put — it's rejected) → apply **IM#4** to
   watch the position go **BULLETPROOF** and the payoff curve lift off the floor.
4. **My Portfolios** → see the new RPM and the goal status update.

---

## What this prototype is / isn't
- **Is:** a faithful, runnable demonstration of every core surface and the real RAT decision logic,
  suitable for stakeholder review and as the front-end spec for production.
- **Isn't:** production. It has **no live market data, no backend, no auth, no bank-link, and places
  no real orders.** Those are the S28 (backend/auth/bank-link) and S29 (deploy) build-outs described
  in `../03_Deliverables/05_USWF_Portal_Deployment_Guide.md`.

## Next steps to production (per M7 / S28–S29)
1. Wire `rat.js`-equivalent logic to a **live options-data feed** and the **RPM-MAS API** (M2–M6).
2. Add **auth + KYC + IPS persistence + bank-link/funding** (S28), fail-closed and PII-safe.
3. Route the Trade ticket to a **broker** (S11) with real order tickets and fills → audit trail (S24).
4. Gate all copy through **Compliance (M6/S22)**; reconcile all numbers to S24 before display.
5. Deploy and repoint the parked GoDaddy domain per **Deliverable 05**.

*All figures simulated. “Limited risk / unlimited potential / bulletproof” are technical states,
not guarantees of profit. Methodology credit: Kurt Frankenberg, PowerOptions.*
