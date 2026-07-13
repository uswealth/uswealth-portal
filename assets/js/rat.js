/* =============================================================================
 * rat.js — The RadioActive Trading (RAT) engine for uswealth.fund
 * -----------------------------------------------------------------------------
 * Faithful implementation of the RPM math from the USWF source docs:
 *   - RPM = 100 shares/contract + 1 ITM protective put  (Married-Put-Setup.md)
 *   - At-Risk = Total Invested − Guaranteed Value        (Apendix6-RAT-Principles.md)
 *   - Position sizing: 4–6% at-risk, never 9%
 *   - CEGA (Cost·Exposure·Gap·Acceptability) + Catastrophe Report  (finding-trades.md)
 *   - Income Method #1 (covered call/collar) and #4 (roll put up / bulletproof)
 *   - Expiration payoff ("hockey stick")
 *
 * All figures are ILLUSTRATIVE/SIMULATED (no live market data). This engine is a
 * faithful teaching/prototype model, not an order-management or pricing system.
 * ========================================================================== */
(function (global) {
  "use strict";

  var SHARES_PER_CONTRACT = 100;

  // ---- Core RPM economics ---------------------------------------------------
  // A "leg set" for N contracts of a married put.
  function buildRPM(o) {
    var n = o.contracts || 1;
    var shares = SHARES_PER_CONTRACT * n;
    var stockCost = o.stockPrice * shares;
    var putCost = o.putPremium * shares;                 // premium quoted per share
    var totalInvested = stockCost + putCost;
    var guaranteedValue = o.putStrike * shares;          // guaranteed by the put
    var atRisk = totalInvested - guaranteedValue;        // biggest hit if left alone
    var atRiskPct = atRisk / totalInvested;
    return {
      ticker: o.ticker, contracts: n, shares: shares,
      stockPrice: o.stockPrice, putStrike: o.putStrike, putPremium: o.putPremium,
      putExpiryDays: o.putExpiryDays,
      stockCost: stockCost, putCost: putCost,
      totalInvested: totalInvested,
      guaranteedValue: guaranteedValue,
      atRisk: atRisk,
      atRiskPct: atRiskPct,
      // income-method state (applied later)
      coveredCall: null,   // { strike, premium }
      income: 0,           // cash collected via income methods
      bulletproof: false
    };
  }

  // ---- Position sizing: how many contracts fit the cash & the 4–6% rule -----
  // At-risk % is a property of the PUT DEPTH, independent of contract count.
  // Contract count is bounded by available cash.
  function sizeToCash(o, cashAvailable) {
    var perContract = (o.stockPrice + o.putPremium) * SHARES_PER_CONTRACT;
    var maxContracts = Math.floor(cashAvailable / perContract);
    return { perContract: perContract, maxContracts: maxContracts };
  }

  // ---- CEGA + Catastrophe Report (the Trade Gate) ---------------------------
  // tolerancePct is the investor's max at-risk (default fund policy = 0.06 target, 0.09 hard cap).
  function tradeGate(rpm, opts) {
    opts = opts || {};
    var targetMax = opts.targetMaxPct != null ? opts.targetMaxPct : 0.06; // 4–6% band top
    var hardCap = opts.hardCapPct != null ? opts.hardCapPct : 0.09;       // never 9%

    var gapPct = (rpm.stockPrice - rpm.putStrike) / rpm.stockPrice; // how far it can fall to the strike
    var cega = {
      cost: rpm.totalInvested,          // C — baseline cost to establish
      exposure: rpm.atRisk,             // E — max downside, defined by the put
      gapPct: gapPct,                   // G — room before insurance activates
      acceptable: rpm.atRiskPct <= targetMax // A — within the fund's thresholds
    };

    // Catastrophe Report: worst case if held to expiry = lose the at-risk amount.
    var worstCaseLoss = rpm.atRisk;
    var verdict, reasons = [];
    if (rpm.atRiskPct > hardCap) {
      verdict = "BLOCKED";
      reasons.push("At-risk " + pct(rpm.atRiskPct) + " exceeds the 9% hard cap.");
    } else if (rpm.atRiskPct > targetMax) {
      verdict = "CAUTION";
      reasons.push("At-risk " + pct(rpm.atRiskPct) + " is above the 4–6% target band (still under 9%). Prefer a deeper put or smaller size.");
    } else {
      verdict = "GREEN";
      reasons.push("Worst case if held: lose the defined at-risk of " + money(worstCaseLoss) + " (" + pct(rpm.atRiskPct) + "). Survivable within tolerance.");
    }
    return { cega: cega, worstCaseLoss: worstCaseLoss, verdict: verdict, reasons: reasons };
  }

  // ---- Income Method #1: sell a covered call (create a collar) ---------------
  // RULE: the call strike MUST be at or above the protective put strike. ATOMIC.
  function applyIM1(rpm, callStrike, callPremium) {
    if (callStrike < rpm.putStrike) {
      return { ok: false, error: "IM#1 violation: never write a call below the protective put strike (" + rpm.putStrike + ")." };
    }
    var credit = callPremium * rpm.shares;
    rpm.coveredCall = { strike: callStrike, premium: callPremium };
    rpm.income += credit;
    rpm.atRisk -= credit;                       // premium reduces the at-risk amount
    rpm.atRiskPct = rpm.atRisk / rpm.totalInvested;
    return { ok: true, credit: credit, newAtRisk: rpm.atRisk, newAtRiskPct: rpm.atRiskPct };
  }

  // ---- Income Method #4: roll the put UP ("the ATM" — bulletproofing) --------
  // STC current put for its value now, BTO a higher-strike put. Net cash OUT.
  // Guaranteed value rises; if guaranteed >= total invested -> BULLETPROOF.
  function applyIM4(rpm, sellPutValueNow, newPutStrike, newPutPremium) {
    var credit = sellPutValueNow * rpm.shares;         // STC old put (all time value)
    var debit = newPutPremium * rpm.shares;            // BTO higher put
    var net = debit - credit;                          // positive = cash deposited
    rpm.totalInvested += net;                          // the "ATM deposit"
    rpm.putStrike = newPutStrike;
    rpm.putPremium = newPutPremium;
    rpm.guaranteedValue = newPutStrike * rpm.shares;
    rpm.atRisk = rpm.totalInvested - rpm.guaranteedValue;
    rpm.atRiskPct = rpm.atRisk / rpm.totalInvested;
    rpm.bulletproof = rpm.atRisk <= 0;                 // negative at-risk = guaranteed profit
    return {
      ok: true, netCash: -net, newGuaranteed: rpm.guaranteedValue,
      newAtRisk: rpm.atRisk, newAtRiskPct: rpm.atRiskPct, bulletproof: rpm.bulletproof
    };
  }

  // ---- Expiration payoff ("hockey stick") -----------------------------------
  // Returns [{s, pnl}] across a price range. Includes covered call cap if present.
  function payoffCurve(rpm, opts) {
    opts = opts || {};
    var lo = opts.lo != null ? opts.lo : rpm.putStrike * 0.6;
    var hi = opts.hi != null ? opts.hi : rpm.stockPrice * 1.8;
    var steps = opts.steps || 60;
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var s = lo + (hi - lo) * (i / steps);
      // position value at expiry = max(s, putStrike) * shares  (stock floored by the put)
      var val = Math.max(s, rpm.putStrike) * rpm.shares;
      // covered call: short call caps value above its strike
      if (rpm.coveredCall) {
        val -= Math.max(s - rpm.coveredCall.strike, 0) * rpm.shares;
      }
      var pnl = val - rpm.totalInvested + rpm.income;
      pts.push({ s: s, pnl: pnl });
    }
    return pts;
  }

  // ---- Portfolio helpers ----------------------------------------------------
  function portfolioMark(portfolio) {
    // Simple mark: sum of each RPM's current-value estimate at the live stock price.
    var invested = 0, value = 0, atRisk = 0, income = 0;
    portfolio.positions.forEach(function (p) {
      var rpm = p.rpm;
      var mark = Math.max(p.livePrice || rpm.stockPrice, rpm.putStrike) * rpm.shares;
      if (rpm.coveredCall) mark -= Math.max((p.livePrice || rpm.stockPrice) - rpm.coveredCall.strike, 0) * rpm.shares;
      invested += rpm.totalInvested;
      value += mark + rpm.income;
      atRisk += Math.max(rpm.atRisk, 0);
      income += rpm.income;
    });
    return {
      invested: invested, value: value, income: income,
      unrealizedPnl: value - invested,
      atRiskDollars: atRisk,
      atRiskPctOfCapital: portfolio.capital ? atRisk / portfolio.capital : 0
    };
  }

  function goalStatus(portfolio) {
    var m = portfolioMark(portfolio);
    var gap = portfolio.goal - m.value;
    var status = m.value >= portfolio.goal ? "ahead"
               : m.value >= portfolio.goal * 0.9 ? "on-track" : "behind";
    return { current: m.value, goal: portfolio.goal, gap: gap, status: status };
  }

  // ---- formatting -----------------------------------------------------------
  function money(x) {
    var s = (x < 0 ? "-" : "") + "$" + Math.abs(x).toLocaleString("en-US", { maximumFractionDigits: 0 });
    return s;
  }
  function pct(x) { return (x * 100).toFixed(1) + "%"; }

  global.RAT = {
    SHARES_PER_CONTRACT: SHARES_PER_CONTRACT,
    buildRPM: buildRPM, sizeToCash: sizeToCash, tradeGate: tradeGate,
    applyIM1: applyIM1, applyIM4: applyIM4, payoffCurve: payoffCurve,
    portfolioMark: portfolioMark, goalStatus: goalStatus,
    money: money, pct: pct
  };
})(typeof window !== "undefined" ? window : globalThis);
