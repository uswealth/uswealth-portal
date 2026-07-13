/* =============================================================================
 * app.js — uswealth.fund portal (prototype)
 * Surfaces (PowerOptions parity): Discover · My Portfolios · Manage RPM · Trade ticket
 * State is in-memory; all data is simulated. No real orders are placed.
 * ========================================================================== */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var money = RAT.money, pct = RAT.pct;

  var state = {
    portfolios: SEED.seedPortfolios(),
    selectedCandidate: null,
    selectedPosition: null
  };

  function riskBadge(p) {
    var cls = p > 0.09 ? "bad" : p > 0.06 ? "warn" : "ok";
    return '<span class="badge ' + cls + '">' + pct(p) + ' at-risk</span>';
  }

  // ---- DISCOVER (RadioActive Search) ---------------------------------------
  function viewDiscover() {
    var rows = SEED.CANDIDATES.map(function (c) {
      var rpm = RAT.buildRPM({ ticker: c.ticker, contracts: 1, stockPrice: c.price, putStrike: c.putStrike, putPremium: c.putPremium, putExpiryDays: c.putExpiryDays });
      return { c: c, rpm: rpm };
    }).sort(function (a, b) { return b.c.epsg - a.c.epsg; }); // EPSG sort, high→low

    var html = '<div class="panel"><div class="panel-head">' +
      '<h2>Discover — RadioActive Search</h2>' +
      '<p class="sub">EPSG-sorted · uptrend (price &gt; 50-DMA) · HV &gt; 25% · put 150–900 DTE · at-risk 3.5–9%. ' +
      '<em>Simulated candidates — not live quotes.</em></p></div>' +
      '<table class="grid"><thead><tr>' +
      '<th>Ticker</th><th>List</th><th>EPSG</th><th>Price</th><th>HV</th><th>Put (strike / DTE)</th>' +
      '<th>Total Invested</th><th>Guaranteed</th><th>At-Risk</th><th></th></tr></thead><tbody>';

    rows.forEach(function (r, i) {
      html += '<tr>' +
        '<td class="tk">' + r.c.ticker + '</td>' +
        '<td>' + r.c.list + '</td>' +
        '<td>' + r.c.epsg + '%</td>' +
        '<td>$' + r.c.price.toFixed(2) + '</td>' +
        '<td>' + r.c.hv + '%</td>' +
        '<td>$' + r.c.putStrike.toFixed(2) + ' / ' + r.c.putExpiryDays + 'd</td>' +
        '<td>' + money(r.rpm.totalInvested) + '</td>' +
        '<td>' + money(r.rpm.guaranteedValue) + '</td>' +
        '<td>' + riskBadge(r.rpm.atRiskPct) + '</td>' +
        '<td><button class="btn sm" data-open="' + i + '">Build RPM ▸</button></td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    var view = $("#view"); view.innerHTML = html;
    view.querySelectorAll("[data-open]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.selectedCandidate = rows[+b.getAttribute("data-open")].c;
        location.hash = "#/trade";
      });
    });
  }

  // ---- MY PORTFOLIOS --------------------------------------------------------
  function viewPortfolios() {
    var html = '<div class="panel"><div class="panel-head"><h2>My Portfolios</h2>' +
      '<p class="sub">Two labeled portfolios per the IPS, linked by cross-portfolio funding.</p></div>';
    state.portfolios.forEach(function (pf) {
      var m = RAT.portfolioMark(pf), g = RAT.goalStatus(pf);
      var statusCls = g.status === "ahead" ? "ok" : g.status === "on-track" ? "warn" : "bad";
      html += '<div class="card">' +
        '<div class="card-head"><h3>' + pf.label + '</h3>' +
          '<span class="badge ' + statusCls + '">' + g.status + '</span></div>' +
        '<div class="kv"><span>Goal</span><b>' + money(pf.goal) + ' · ' + pf.horizon + '</b></div>' +
        '<div class="kv"><span>Current value</span><b>' + money(m.value) + '</b></div>' +
        '<div class="kv"><span>Gap to goal</span><b>' + money(g.gap) + '</b></div>' +
        '<div class="kv"><span>Invested / income</span><b>' + money(m.invested) + ' · ' + money(m.income) + '</b></div>' +
        '<div class="kv"><span>Portfolio at-risk</span><b>' + money(m.atRiskDollars) + ' (' + pct(m.atRiskPctOfCapital) + ' of capital)</b></div>' +
        '<table class="grid tight"><thead><tr><th>RPM</th><th>Live</th><th>Put</th><th>At-Risk</th><th>Status</th><th></th></tr></thead><tbody>';
      pf.positions.forEach(function (pos, pi) {
        var r = pos.rpm;
        html += '<tr><td class="tk">' + r.ticker + '</td>' +
          '<td>$' + (pos.livePrice || r.stockPrice).toFixed(2) + '</td>' +
          '<td>$' + r.putStrike.toFixed(2) + '</td>' +
          '<td>' + (r.bulletproof ? '<span class="badge ok">BULLETPROOF</span>' : riskBadge(Math.max(r.atRiskPct, 0))) + '</td>' +
          '<td>' + (r.coveredCall ? 'collar @ $' + r.coveredCall.strike : 'married put') + '</td>' +
          '<td><button class="btn sm" data-manage="' + pf.id + ':' + pi + '">Manage ▸</button></td></tr>';
      });
      html += '</tbody></table></div>';
    });
    html += '</div>';
    var view = $("#view"); view.innerHTML = html;
    view.querySelectorAll("[data-manage]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = b.getAttribute("data-manage").split(":");
        state.selectedPosition = { pfId: parts[0], idx: +parts[1] };
        location.hash = "#/manage";
      });
    });
  }

  // ---- MANAGE RPM (Position Analysis + Income Methods) ----------------------
  function viewManage() {
    var sel = state.selectedPosition;
    if (!sel) { location.hash = "#/portfolios"; return; }
    var pf = state.portfolios.filter(function (p) { return p.id === sel.pfId; })[0];
    var pos = pf.positions[sel.idx], rpm = pos.rpm;

    function render() {
      var curve = RAT.payoffCurve(rpm);
      var bp = rpm.bulletproof;
      var html = '<div class="panel"><div class="panel-head">' +
        '<h2>Manage RPM — ' + rpm.ticker + ' <span class="muted">(' + pf.label + ')</span></h2>' +
        '<p class="sub">Position analysis + income methods. Each change re-runs the Catastrophe Report.</p></div>' +
        '<div class="two-col"><div>' +
          '<div class="kv"><span>Total Invested</span><b>' + money(rpm.totalInvested) + '</b></div>' +
          '<div class="kv"><span>Guaranteed Value (put $' + rpm.putStrike.toFixed(2) + ')</span><b>' + money(rpm.guaranteedValue) + '</b></div>' +
          '<div class="kv"><span>At-Risk</span><b>' + (bp ? '<span class="badge ok">BULLETPROOF (' + money(rpm.atRisk) + ')</span>' : money(rpm.atRisk) + ' (' + pct(rpm.atRiskPct) + ')') + '</b></div>' +
          '<div class="kv"><span>Income collected</span><b>' + money(rpm.income) + '</b></div>' +
          '<div class="kv"><span>Covered call</span><b>' + (rpm.coveredCall ? '$' + rpm.coveredCall.strike + ' (collar)' : 'none') + '</b></div>' +
        '</div><div class="chart-wrap">' + CHART.payoffSVG(curve) + '</div></div>';

      // Income Method panels
      html += '<div class="im-grid">';
      // IM#1
      html += '<div class="im"><h4>IM#1 — Covered Call / Collar</h4>' +
        '<p class="hint">ATOMIC call, <b>at or above</b> the put strike ($' + rpm.putStrike.toFixed(2) + '). ~1%/mo target.</p>' +
        '<label>Call strike <input id="im1s" type="number" step="0.5" value="' + (Math.ceil(rpm.putStrike) + 2) + '"></label>' +
        '<label>Premium <input id="im1p" type="number" step="0.05" value="0.90"></label>' +
        '<button class="btn" id="im1go">Apply IM#1</button><div id="im1msg" class="msg"></div></div>';
      // IM#4
      html += '<div class="im"><h4>IM#4 — Roll Put Up (Bulletproof)</h4>' +
        '<p class="hint">STC current put (all time value), BTO a higher-strike put. Locks a guaranteed floor.</p>' +
        '<label>Sell current put @ <input id="im4s" type="number" step="0.05" value="0.80"></label>' +
        '<label>New put strike <input id="im4k" type="number" step="0.5" value="' + (Math.round(rpm.stockPrice)) + '"></label>' +
        '<label>New put premium <input id="im4p" type="number" step="0.05" value="' + (rpm.putPremium + 1.2).toFixed(2) + '"></label>' +
        '<button class="btn" id="im4go">Apply IM#4</button><div id="im4msg" class="msg"></div></div>';
      html += '</div></div>';

      $("#view").innerHTML = html;

      $("#im1go").addEventListener("click", function () {
        var r = RAT.applyIM1(rpm, parseFloat($("#im1s").value), parseFloat($("#im1p").value));
        var el = $("#im1msg");
        if (!r.ok) { el.className = "msg err"; el.textContent = r.error; return; }
        el.className = "msg ok"; el.textContent = "Collected " + money(r.credit) + ". New at-risk " + money(r.newAtRisk) + " (" + pct(r.newAtRiskPct) + ").";
        render();
      });
      $("#im4go").addEventListener("click", function () {
        var r = RAT.applyIM4(rpm, parseFloat($("#im4s").value), parseFloat($("#im4k").value), parseFloat($("#im4p").value));
        var el = $("#im4msg");
        el.className = "msg " + (r.bulletproof ? "ok" : "warn");
        el.textContent = "Net cash " + money(r.netCash) + ". Guaranteed " + money(r.newGuaranteed) + ". " +
          (r.bulletproof ? "Position is now BULLETPROOF (negative at-risk)." : "New at-risk " + money(r.newAtRisk) + " (" + pct(r.newAtRiskPct) + ").");
        render();
      });
    }
    render();
  }

  // ---- TRADE TICKET (Construction + CEGA/Catastrophe Trade Gate) ------------
  function viewTrade() {
    var c = state.selectedCandidate;
    if (!c) {
      $("#view").innerHTML = '<div class="panel"><h2>Trade ticket</h2><p class="sub">Pick a candidate from <a href="#/discover">Discover</a> first.</p></div>';
      return;
    }
    function render(contracts, pfId) {
      var rpm = RAT.buildRPM({ ticker: c.ticker, contracts: contracts, stockPrice: c.price, putStrike: c.putStrike, putPremium: c.putPremium, putExpiryDays: c.putExpiryDays });
      var gate = RAT.tradeGate(rpm);
      var pf = state.portfolios.filter(function (p) { return p.id === pfId; })[0];
      var sizing = RAT.sizeToCash(c, pf.capital);
      var vClass = gate.verdict === "GREEN" ? "ok" : gate.verdict === "CAUTION" ? "warn" : "bad";

      var html = '<div class="panel"><div class="panel-head"><h2>Trade ticket — build ' + c.ticker + ' RPM</h2>' +
        '<p class="sub">Buy 100 shares/contract + 1 protective put. Put limit first, then stock at market.</p></div>' +
        '<div class="two-col"><div>' +
          '<label>Portfolio <select id="pf">' + state.portfolios.map(function (p) {
              return '<option value="' + p.id + '"' + (p.id === pfId ? ' selected' : '') + '>' + p.label + ' (cash ' + money(p.capital) + ')</option>';
            }).join("") + '</select></label>' +
          '<label>Contracts <input id="ct" type="number" min="1" value="' + contracts + '"> ' +
            '<span class="muted">max ' + sizing.maxContracts + ' at ' + money(sizing.perContract) + '/contract</span></label>' +
          '<div class="kv"><span>Buy ' + rpm.shares + ' sh @ $' + c.price.toFixed(2) + '</span><b>' + money(rpm.stockCost) + '</b></div>' +
          '<div class="kv"><span>BTO ' + contracts + ' put $' + c.putStrike.toFixed(2) + ' @ $' + c.putPremium.toFixed(2) + '</span><b>' + money(rpm.putCost) + '</b></div>' +
          '<div class="kv total"><span>Total Invested</span><b>' + money(rpm.totalInvested) + '</b></div>' +
          '<div class="kv"><span>Guaranteed Value</span><b>' + money(rpm.guaranteedValue) + '</b></div>' +
          '<div class="kv"><span>At-Risk</span><b>' + riskBadge(rpm.atRiskPct) + ' = ' + money(rpm.atRisk) + '</b></div>' +
        '</div><div class="chart-wrap">' + CHART.payoffSVG(RAT.payoffCurve(rpm)) + '</div></div>';

      // Trade Gate
      html += '<div class="gate ' + vClass + '"><h3>Trade Gate — CEGA + Catastrophe Report: <b>' + gate.verdict + '</b></h3>' +
        '<ul><li><b>C</b>ost: ' + money(gate.cega.cost) + '</li>' +
        '<li><b>E</b>xposure (max loss): ' + money(gate.cega.exposure) + '</li>' +
        '<li><b>G</b>ap to put strike: ' + pct(gate.cega.gapPct) + '</li>' +
        '<li><b>A</b>cceptability: ' + (gate.cega.acceptable ? 'within 4–6% target' : 'above 4–6% target') + '</li></ul>' +
        '<p class="reason">' + gate.reasons.join(" ") + '</p>' +
        (rpm.totalInvested > pf.capital ? '<p class="reason err">Insufficient cash in ' + pf.label + ' for ' + contracts + ' contract(s).</p>' : '') +
        '<button class="btn primary" id="open"' + (gate.verdict === "BLOCKED" || rpm.totalInvested > pf.capital ? ' disabled' : '') + '>' +
          (gate.verdict === "GREEN" ? "Approve at Trade Gate & open RPM" : "Override requires investor sign-off") + '</button>' +
        '<p class="disc">Simulated. Approving records the RPM in the selected portfolio for this session only — no real order is sent.</p></div></div>';

      $("#view").innerHTML = html;
      $("#pf").addEventListener("change", function () { render(contracts, this.value); });
      $("#ct").addEventListener("change", function () { render(Math.max(1, parseInt(this.value, 10) || 1), $("#pf").value); });
      var openBtn = $("#open");
      if (openBtn) openBtn.addEventListener("click", function () {
        pf.positions.push({ rpm: rpm, livePrice: c.price });
        pf.capital = Math.max(0, pf.capital - rpm.totalInvested);
        state.selectedPosition = { pfId: pf.id, idx: pf.positions.length - 1 };
        location.hash = "#/manage";
      });
    }
    render(1, state.portfolios[0].id);
  }

  // ---- router ---------------------------------------------------------------
  var routes = { "#/discover": viewDiscover, "#/portfolios": viewPortfolios, "#/manage": viewManage, "#/trade": viewTrade };
  function route() {
    var h = location.hash || "#/discover";
    (routes[h] || viewDiscover)();
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === h);
    });
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", function () {
    if (!location.hash) location.hash = "#/discover";
    route();
  });
})();
