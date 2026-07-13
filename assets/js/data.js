/* =============================================================================
 * data.js — Seed data for the uswealth.fund prototype
 * -----------------------------------------------------------------------------
 * SIMULATED, ILLUSTRATIVE data only — not live quotes. Tickers are placeholders.
 * Candidates mimic the RadioActive Screen output (finding-trades.md):
 *   EPSG-sorted, uptrend (price>50DMA), HV>25%, put 150–900 DTE, at-risk 3.5–9%.
 * Portfolios seed the reference IPS (Emmanuel & Josephine).
 * ========================================================================== */
(function (global) {
  "use strict";

  // Candidate universe passing the RadioActive Screen (illustrative).
  // atRisk% is computed by RAT.buildRPM at render time; values here are inputs.
  var CANDIDATES = [
    { ticker: "NVAX", epsg: 62, price: 48.00, hv: 41, uptrend: true, list: "IBD 50",  putStrike: 47.5, putPremium: 2.00, putExpiryDays: 210, oi: 3400 },
    { ticker: "ARGX", epsg: 55, price: 88.00, hv: 33, uptrend: true, list: "CANSLIM", putStrike: 87.5, putPremium: 4.00, putExpiryDays: 240, oi: 1800 },
    { ticker: "TREX", epsg: 48, price: 62.50, hv: 29, uptrend: true, list: "IBD 50",  putStrike: 62.5, putPremium: 3.10, putExpiryDays: 180, oi: 2600 },
    { ticker: "CELH", epsg: 71, price: 34.20, hv: 47, uptrend: true, list: "IBD 50",  putStrike: 34.0, putPremium: 1.60, putExpiryDays: 200, oi: 5100 },
    { ticker: "DKNG", epsg: 44, price: 39.75, hv: 38, uptrend: true, list: "CANSLIM", putStrike: 39.0, putPremium: 2.20, putExpiryDays: 165, oi: 4200 },
    { ticker: "PSTG", epsg: 39, price: 54.10, hv: 31, uptrend: true, list: "IBD 50",  putStrike: 54.0, putPremium: 2.60, putExpiryDays: 195, oi: 1500 },
    { ticker: "ELF",  epsg: 58, price: 96.40, hv: 36, uptrend: true, list: "IBD 50",  putStrike: 95.0, putPremium: 4.40, putExpiryDays: 220, oi: 1300 },
    { ticker: "FSLR", epsg: 51, price: 72.30, hv: 34, uptrend: true, list: "CANSLIM", putStrike: 72.0, putPremium: 3.30, putExpiryDays: 250, oi: 2900 }
  ];

  // Reference IPS portfolios (IPS.md). Positions seeded from the Cash-at-Hand deliverable.
  function seedPortfolios() {
    var homeRPM = RAT.buildRPM({ ticker: "NVAX", contracts: 1, stockPrice: 48.00, putStrike: 47.5, putPremium: 2.00, putExpiryDays: 210 });
    var wedRPM  = RAT.buildRPM({ ticker: "ARGX", contracts: 1, stockPrice: 88.00, putStrike: 87.5, putPremium: 4.00, putExpiryDays: 240 });
    return [
      {
        id: "E-and-J-Home", label: "E-and-J-Home",
        goal: 50000, horizon: "1–3 months", capital: 5010,
        positions: [ { rpm: homeRPM, livePrice: 49.10 } ]
      },
      {
        id: "E-and-J-Wedding", label: "E-and-J-Wedding",
        goal: 100000, horizon: "6–9 months", capital: 9210,
        positions: [ { rpm: wedRPM, livePrice: 90.25 } ]
      }
    ];
  }

  global.SEED = { CANDIDATES: CANDIDATES, seedPortfolios: seedPortfolios };
})(typeof window !== "undefined" ? window : globalThis);
