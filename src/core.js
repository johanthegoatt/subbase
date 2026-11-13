// Subbase core: how much aggregate a job actually needs, by weight. No DOM in
// here, so the same file runs in the page and under `node --test`.
//
// The thing a "length times width times depth" guess misses is that aggregate
// is sold by WEIGHT, not volume. You work out the volume you want to fill, then
// turn it into tonnes with the material's bulk density (how heavy a cubic metre
// of it is). A cubic metre of MOT Type 1 weighs about twice what a cubic metre
// of light slate chippings does, so the same hole needs very different tonnage.
//
// The second thing it misses is compaction. A sub-base is laid loose and then
// whacked down with a plate, losing roughly a tenth of its height, so you have
// to order extra loose material to end up at the depth you want once it's
// compacted. A decorative gravel you just rake level doesn't compact, so it
// gets no extra. Subbase works out the volume, the loose volume to order, the
// tonnes, the bulk bags and a waste margin, and shows the coverage per tonne so
// you can sanity-check it against a supplier's own figure.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Subbase = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var IN = 0.0254;   // metres per inch
  var FT = 0.3048;   // metres per foot
  var YD = 0.9144;   // metres per yard

  // Materials, with a typical loose bulk density in tonnes per cubic metre and
  // whether the material is normally compacted (a sub-base) or just spread
  // (decorative). Densities are mid-range figures from UK aggregate suppliers;
  // moisture and the exact stone change them, so the supplier's own figure wins
  // and every one of these is editable on the page.
  var MATERIALS = {
    "mot1":     { label: "MOT Type 1 sub-base", density: 2.0, compacts: true },
    "scalpings":{ label: "Crushed stone / scalpings", density: 1.9, compacts: true },
    "ballast":  { label: "All-in ballast (sand + gravel)", density: 1.8, compacts: false },
    "gravel":   { label: "Gravel / shingle (10-20 mm)", density: 1.7, compacts: false },
    "pea":      { label: "Pea gravel", density: 1.6, compacts: false },
    "sharp":    { label: "Sharp / grit sand", density: 1.6, compacts: false },
    "soft":     { label: "Building / soft sand", density: 1.5, compacts: false },
    "slate":    { label: "Slate chippings", density: 1.3, compacts: false },
    "topsoil":  { label: "Topsoil (loose)", density: 1.5, compacts: false },
    "custom":   { label: "Custom material", density: 1.7, compacts: false }
  };

  function num(v) {
    var n = typeof v === "number" ? v : parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) ? n : NaN;
  }

  // Any length into metres. Default unit is metres.
  function toM(value, unit) {
    var n = num(value);
    if (!isFinite(n)) return NaN;
    if (unit === "mm") return n / 1000;
    if (unit === "cm") return n / 100;
    if (unit === "in") return n * IN;
    if (unit === "ft") return n * FT;
    if (unit === "yd") return n * YD;
    return n; // metres
  }

  // An area into square metres, from whatever unit the length boxes use.
  function areaToM2(value, unit) {
    var n = num(value);
    if (!isFinite(n)) return NaN;
    if (unit === "mm") return n / 1e6;
    if (unit === "cm") return n / 1e4;
    if (unit === "in") return n * IN * IN;
    if (unit === "ft") return n * FT * FT;
    if (unit === "yd") return n * YD * YD;
    return n; // square metres
  }

  function round2(x) { return Math.round(x * 100) / 100; }
  function round1(x) { return Math.round(x * 10) / 10; }
  function round3(x) { return Math.round(x * 1000) / 1000; }

  // Work out the area to cover, either straight from an area box or from a
  // length and width. Returns square metres, or NaN if there's nothing usable.
  function area(opts) {
    if (opts.area && opts.area.value !== "" && opts.area.value != null) {
      var a = areaToM2(opts.area.value, opts.area.unit || opts.lengthUnit);
      if (a > 0) return a;
    }
    var L = toM(opts.length && opts.length.value, (opts.length && opts.length.unit) || opts.lengthUnit);
    var W = toM(opts.width && opts.width.value, (opts.width && opts.width.unit) || opts.lengthUnit);
    if (L > 0 && W > 0) return L * W;
    return NaN;
  }

  // The main calculation.
  //   length / width: { value, unit } of the area, OR
  //   area:           { value, unit } a straight area (unit is a length unit, squared).
  //   depth:          { value, unit } the finished (compacted, if a sub-base) depth.
  //   material:       key into MATERIALS, or "custom".
  //   density:        override tonnes per cubic metre (for custom or a known figure).
  //   compact:        true to add a compaction allowance (default follows the material).
  //   compaction:     percent of extra loose depth lost to compaction (default 15).
  //   waste:          percent extra for spillage, over-dig and levelling (default 10).
  //   bagKg:          weight of one bulk/dumpy bag in kg (default 850).
  //   pricePerTonne / pricePerBag: optional, to put a cost on it.
  function plan(opts) {
    opts = opts || {};

    var matKey = MATERIALS[opts.material] ? opts.material : "mot1";
    var preset = MATERIALS[matKey];

    var density = num(opts.density);
    if (!(density > 0)) density = preset.density;

    var a = area(opts);
    var depth = toM(opts.depth && opts.depth.value, (opts.depth && opts.depth.unit) || "mm");
    if (!(a > 0)) return { ok: false, reason: "bad-area" };
    if (!(depth > 0)) return { ok: false, reason: "bad-depth" };

    var waste = num(opts.waste);
    if (!(waste >= 0)) waste = 10;

    // Whether to add a compaction allowance. Defaults to the material (a sub-base
    // compacts, decorative gravel doesn't), but the page can override it.
    var compact = opts.compact == null ? preset.compacts : !!opts.compact;
    var compaction = num(opts.compaction);
    if (!(compaction >= 0)) compaction = 15;
    var compPct = compact ? compaction : 0;

    // The finished volume you want in place, then the loose volume you actually
    // have to order once compaction and waste are allowed for.
    var finishedVol = a * depth;
    var allowance = compPct + waste;            // combined extra, in percent
    var orderVol = finishedVol * (1 + allowance / 100);

    // Aggregate is sold by weight: turn the loose volume into tonnes.
    var tonnes = orderVol * density;

    var bagKg = num(opts.bagKg);
    if (!(bagKg > 0)) bagKg = 850;              // a typical dumpy/bulk bag
    var bulkBags = Math.ceil((tonnes * 1000 - 1e-6) / bagKg);
    var handyBags = Math.ceil((tonnes * 1000 - 1e-6) / 25); // 25 kg handy bags

    // Coverage per tonne at this depth, so you can check it against a supplier's
    // "one tonne covers X m² at Y mm" line on the product page.
    var coveragePerTonne = depth > 0 && density > 0 ? 1 / (depth * density) : 0;

    var out = {
      ok: true,
      material: matKey,
      materialLabel: matKey === "custom" ? "Custom material" : preset.label,
      density: round2(density),
      compacts: compact,
      compaction: compPct,
      waste: waste,
      areaM2: round2(a),
      depthMm: Math.round(depth * 1000),
      finishedVol: round2(finishedVol),
      orderVol: round2(orderVol),
      tonnes: round2(tonnes),
      kg: Math.round(tonnes * 1000),
      bagKg: bagKg,
      bulkBags: bulkBags,
      handyBags: handyBags,
      coveragePerTonne: round1(coveragePerTonne)
    };

    var priceT = num(opts.pricePerTonne);
    var priceB = num(opts.pricePerBag);
    if (isFinite(priceB) && priceB > 0) out.cost = round2(bulkBags * priceB);
    else if (isFinite(priceT) && priceT > 0) out.cost = round2(tonnes * priceT);
    else out.cost = null;
    out.costBasis = (isFinite(priceB) && priceB > 0) ? "bags" : (isFinite(priceT) && priceT > 0) ? "tonnes" : null;

    out.advice = advise(out);
    return out;
  }

  function advise(r) {
    var tips = [];

    tips.push("Order about " + r.tonnes + " tonne" + (r.tonnes === 1 ? "" : "s") + " of " +
      r.materialLabel.toLowerCase() + " — roughly " + r.bulkBags + " bulk bag" +
      (r.bulkBags === 1 ? "" : "s") + " at " + r.bagKg + " kg, or " + r.handyBags + " handy 25 kg bags.");

    tips.push("Aggregate is sold by weight, so the key figure is the bulk density: " + r.density +
      " tonnes per cubic metre here. A heavier stone means more tonnes for the same hole, so confirm the density on the supplier's own product page.");

    if (r.compacts && r.compaction > 0) {
      tips.push("A sub-base is laid loose and then whacked down, losing height, so I've added " + r.compaction +
        "% extra to reach " + r.depthMm + " mm once compacted. Lay and compact it in layers no more than about 100 mm at a time.");
    } else {
      tips.push("This material isn't compacted, so there's no compaction allowance — just rake it level to " +
        r.depthMm + " mm.");
    }

    tips.push("That works out at roughly " + r.coveragePerTonne + " m² per tonne at " + r.depthMm +
      " mm deep. If the supplier's page quotes a different coverage, use their density instead of mine.");

    if (r.waste > 0) {
      tips.push("The " + r.waste + "% waste margin covers spillage, an uneven base and levelling. A bulk bag can settle below its stated weight, so having a little over is normal.");
    }

    tips.push("Planning figures. Densities vary with moisture and the exact stone; a wet load weighs more than a dry one. Order from one supplier so the colour and grade match across bags.");
    return tips;
  }

  // Typical compacted sub-base depths by what the surface carries. The depth a
  // job needs is the thing a tonnage sum can't tell you, and it's the usual
  // reason a path or drive fails early — too thin for the load. These are the
  // common UK ranges: a pedestrian path wants little, a patio more, and a
  // driveway more again, with soft or clay ground pushing every job to the
  // upper end and needing a geotextile membrane under the stone so the subsoil
  // doesn't work up into it. Figures from aggregate suppliers' sub-base depth
  // guides (Materials Market, Marshalls, Primethorpe Paving); the ground and a
  // look at the dug base decide the final depth.
  var USES = {
    "path":     { label: "Garden path (on foot)",        min: 50,  max: 75,  typical: 75 },
    "patio":    { label: "Patio (light foot traffic)",   min: 100, max: 150, typical: 100 },
    "shed":     { label: "Shed or greenhouse base",      min: 100, max: 150, typical: 100 },
    "driveway": { label: "Driveway (cars, light vans)",  min: 150, max: 200, typical: 150 },
    "heavy":    { label: "Heavy use (vans, occasional lorry)", min: 200, max: 300, typical: 200 }
  };

  // Suggest a sub-base depth in mm for a job and ground. Soft or clay ground
  // takes the upper end and a membrane; firm ground takes the typical figure.
  function typicalDepth(use, ground) {
    var u = USES[use];
    if (!u) return null;
    var soft = ground === "soft";
    var mm = soft ? u.max : u.typical;
    var note = soft
      ? "Soft or clay ground, so take the deeper end and lay a geotextile membrane under the stone to keep the subsoil out of it."
      : "Firm ground. If the base digs out soft or wet, go to " + u.max + " mm and add a membrane.";
    return {
      use: use,
      label: u.label,
      min: u.min,
      max: u.max,
      mm: mm,
      membrane: soft,
      note: note
    };
  }

  // The whole input goes in the URL fragment, which a browser never sends to a
  // server, so a shared link reopens on the same job without anything leaving
  // the device.
  function pack(state) {
    var json = JSON.stringify(state);
    var b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, "utf8").toString("base64");
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function unpack(text) {
    try {
      var b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var json = typeof atob === "function" ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, "base64").toString("utf8");
      var o = JSON.parse(json);
      return o && typeof o === "object" ? o : null;
    } catch (e) { return null; }
  }

  return {
    IN: IN, FT: FT, YD: YD, MATERIALS: MATERIALS, USES: USES,
    toM: toM, areaToM2: areaToM2, area: area,
    round1: round1, round2: round2, round3: round3,
    typicalDepth: typicalDepth,
    plan: plan, advise: advise, pack: pack, unpack: unpack
  };
});
