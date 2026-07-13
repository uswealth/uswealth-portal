/* =============================================================================
 * charts.js — tiny dependency-free SVG chart for the RPM "hockey stick" payoff
 * ========================================================================== */
(function (global) {
  "use strict";

  function payoffSVG(points, opts) {
    opts = opts || {};
    var W = opts.width || 560, H = opts.height || 260, pad = 40;
    var xs = points.map(function (p) { return p.s; });
    var ys = points.map(function (p) { return p.pnl; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    // pad the y-range and always include 0
    minY = Math.min(minY, 0); maxY = Math.max(maxY, 0);
    var rangeY = (maxY - minY) || 1;
    minY -= rangeY * 0.1; maxY += rangeY * 0.1;

    function sx(x) { return pad + (x - minX) / ((maxX - minX) || 1) * (W - 2 * pad); }
    function sy(y) { return H - pad - (y - minY) / ((maxY - minY) || 1) * (H - 2 * pad); }

    var path = points.map(function (p, i) {
      return (i === 0 ? "M" : "L") + sx(p.s).toFixed(1) + "," + sy(p.pnl).toFixed(1);
    }).join(" ");

    var zeroY = sy(0);
    var svg = [];
    svg.push('<svg viewBox="0 0 ' + W + ' ' + H + '" class="payoff" role="img" aria-label="Position payoff at expiration">');
    // zero line
    svg.push('<line x1="' + pad + '" y1="' + zeroY.toFixed(1) + '" x2="' + (W - pad) + '" y2="' + zeroY.toFixed(1) + '" class="axis0"/>');
    // axes
    svg.push('<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" class="axis"/>');
    svg.push('<line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (H - pad) + '" class="axis"/>');
    // the payoff line
    svg.push('<path d="' + path + '" class="curve"/>');
    // labels
    svg.push('<text x="' + (W - pad) + '" y="' + (H - pad + 16) + '" class="lbl" text-anchor="end">stock price at expiry →</text>');
    svg.push('<text x="' + pad + '" y="' + (pad - 12) + '" class="lbl">P&amp;L ($)</text>');
    svg.push('<text x="' + (pad + 4) + '" y="' + (zeroY - 4).toFixed(1) + '" class="lbl0">break-even</text>');
    svg.push('</svg>');
    return svg.join("");
  }

  global.CHART = { payoffSVG: payoffSVG };
})(typeof window !== "undefined" ? window : globalThis);
