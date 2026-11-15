// Subbase page glue: read the form, run the engine in core.js, draw the order,
// keep the share link in sync, and tell Grit what's going on. All the real work
// lives in core.js so it can be tested without a browser.
(function () {
  "use strict";
  var S = window.Subbase;
  var $ = function (id) { return document.getElementById(id); };

  var ids = ["length", "width", "area", "len-unit", "depth", "depth-unit",
    "material", "density", "compact", "compaction", "waste", "bag-kg", "price", "price-unit",
    "laying", "laying-depth"];
  var el = {};
  ids.forEach(function (id) { el[id] = $(id); });
  var out = $("out");

  function readState() {
    return {
      l: el.length.value.trim(), w: el.width.value.trim(), a: el.area.value.trim(), lu: el["len-unit"].value,
      d: el.depth.value.trim(), du: el["depth-unit"].value,
      m: el.material.value, den: el.density.value.trim(),
      c: el.compact.checked ? 1 : 0, cp: el.compaction.value.trim(), ws: el.waste.value.trim(),
      bk: el["bag-kg"].value.trim(), p: el.price.value.trim(), pu: el["price-unit"].value,
      lc: el.laying.checked ? 1 : 0, lcd: el["laying-depth"].value.trim()
    };
  }

  function writeState(s) {
    if (!s) return;
    if (s.l != null) el.length.value = s.l;
    if (s.w != null) el.width.value = s.w;
    if (s.a != null) el.area.value = s.a;
    if (s.lu) el["len-unit"].value = s.lu;
    if (s.d != null) el.depth.value = s.d;
    if (s.du) el["depth-unit"].value = s.du;
    if (s.m) el.material.value = s.m;
    if (s.den != null) el.density.value = s.den;
    if (s.c != null) el.compact.checked = !!s.c;
    if (s.cp != null) el.compaction.value = s.cp;
    if (s.ws != null) el.waste.value = s.ws;
    if (s.bk != null) el["bag-kg"].value = s.bk;
    if (s.p != null) el.price.value = s.p;
    if (s.pu) el["price-unit"].value = s.pu;
    if (s.lc != null) el.laying.checked = !!s.lc;
    if (s.lcd != null) el["laying-depth"].value = s.lcd;
  }

  function cell(k, v, u, big) {
    return '<div class="cell' + (big ? " big" : "") + '"><span class="k">' + k + '</span><span class="v">' + v +
      (u ? '<span class="u"> ' + u + '</span>' : "") + '</span></div>';
  }

  function render(r) {
    if (!r || !r.ok) {
      var msg = r && r.reason === "bad-area" ? "Enter a length and width, or the area you want to cover."
        : r && r.reason === "bad-depth" ? "Enter how deep you want it, usually in millimetres."
        : "Fill in the area and the depth to start.";
      out.innerHTML = '<div class="result bad"><h3>Nothing to work out yet</h3><p class="msg">' + msg + '</p></div>';
      return "bad";
    }

    var pill = r.compacts
      ? '<span class="tagpill">sub-base, compacts</span>'
      : '<span class="tagpill good">spread to depth</span>';

    var grid =
      cell("Tonnes", r.tonnes, "t", true) +
      cell("Bulk bags", r.bulkBags, "") +
      cell("Loose volume", r.orderVol, "m³") +
      cell("Per tonne", r.coveragePerTonne, "m²") +
      (r.cost != null ? cell("Cost", r.cost, "") : "");

    // How much of the order is the allowance (compaction + waste) over the bare
    // finished volume, shown as a small bar so the extra is visible.
    var extraVol = Math.max(0, r.orderVol - r.finishedVol);
    var extraPct = r.orderVol > 0 ? Math.round((extraVol / r.orderVol) * 100) : 0;
    var barPct = Math.max(2, Math.min(100, extraPct));
    var barClass = extraPct >= 22 ? "fill-bar high" : extraPct >= 12 ? "fill-bar mid" : "fill-bar";
    var fillBlock =
      '<div class="fill">' +
        '<div class="fill-track"><div class="' + barClass + '" style="width:' + barPct + '%"></div></div>' +
        '<p class="fill-label">You want ' + r.finishedVol + ' m³ in place; I’ve ordered ' + r.orderVol +
        ' m³ loose (' + extraPct + '% extra' +
        (r.compacts && r.compaction > 0 ? ', including ' + r.compaction + '% for compaction' : '') +
        ').</p>' +
      '</div>';

    var matBox =
      '<div class="opt"><div class="opt-h">' + r.materialLabel + ' ' + pill + '</div>' +
      '<p class="opt-sub">Bulk density ' + r.density + ' t/m³. ' +
      (r.compacts
        ? 'Laid and compacted, so there’s a compaction allowance on top.'
        : 'Spread and raked level, so no compaction allowance.') +
      ' Order is about ' + r.tonnes + ' t = ' + r.bulkBags + ' bulk bag' + (r.bulkBags === 1 ? '' : 's') +
      ' at ' + r.bagKg + ' kg, or ' + r.handyBags + ' handy 25 kg bags.</p></div>';

    var layingBlock = "";
    if (r.layingCourse && r.layingCourse.ok) {
      var lc = r.layingCourse;
      layingBlock =
        '<div class="result"><h3>Laying course (sharp sand)</h3>' +
          '<div class="opt"><div class="opt-h">On top of the sub-base, for block paving or slabs</div>' +
          '<div class="grid">' +
            cell("Sharp sand", lc.tonnes, "t", true) +
            cell("Bulk bags", lc.bulkBags, "") +
            cell("Bed depth", lc.depthMm, "mm") +
          '</div>' +
          '<p class="opt-sub">A ' + lc.depthMm + ' mm sharp-sand bed over ' + r.areaM2 + ' m² at ' + lc.density +
          ' t/m³. Order it with the sub-base so you’re not short on laying day.</p></div></div>';
    }

    var advice = '<ul class="advice">' + r.advice.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul>";

    out.innerHTML =
      '<div class="result">' +
        '<h3>' + r.areaM2 + ' m² at ' + r.depthMm + ' mm deep</h3>' +
        '<div class="opt pick">' +
          '<div class="opt-h">The order</div>' +
          '<div class="grid">' + grid + '</div>' +
          fillBlock +
        '</div>' +
      '</div>' +
      '<div class="result"><h3>The material</h3>' + matBox + '</div>' +
      layingBlock +
      '<div class="result"><h3>What to do</h3>' + advice + '</div>';

    // Heavy if the order is a few tonnes (tipper territory), sub if it compacts,
    // otherwise an easy light spread.
    if (r.tonnes >= 5) return "heavy";
    return r.compacts ? "sub" : "light";
  }

  function recompute() {
    var s = readState();
    var r = S.plan({
      length: { value: s.l, unit: s.lu }, width: { value: s.w, unit: s.lu },
      area: { value: s.a, unit: s.lu },
      depth: { value: s.d, unit: s.du },
      material: s.m, density: s.den === "" ? undefined : s.den,
      compact: el.compact.checked,
      compaction: s.cp === "" ? undefined : parseFloat(s.cp),
      waste: s.ws === "" ? undefined : parseFloat(s.ws),
      bagKg: s.bk === "" ? undefined : parseFloat(s.bk),
      pricePerTonne: s.pu === "tonne" ? s.p : undefined,
      pricePerBag: s.pu === "bag" ? s.p : undefined,
      layingCourse: el.laying.checked,
      layingCourseDepthMm: s.lcd === "" ? undefined : parseFloat(s.lcd)
    });
    var kind = render(r);
    if (window.Grit) window.Grit.react(kind);
    syncLink(s);
  }

  var linkState = "";
  function syncLink(s) {
    linkState = S.pack(s);
    try { history.replaceState(null, "", "#" + linkState); } catch (e) { /* ignore */ }
  }

  $("share").addEventListener("click", function () {
    var url = location.origin + location.pathname + "#" + linkState;
    var done = $("share-done");
    function ok() { done.textContent = "Link copied"; setTimeout(function () { done.textContent = ""; }, 2500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { done.textContent = url; });
    else { done.textContent = url; }
  });

  // Picking a material fills in its typical density and sets whether it compacts,
  // unless the user has typed their own density. Custom leaves the density box
  // for you to fill from the supplier's page.
  function onMaterial(keepDensity) {
    var key = el.material.value;
    var preset = S.MATERIALS[key] || S.MATERIALS.mot1;
    var custom = key === "custom";
    if (!keepDensity) el.density.value = custom ? "" : preset.density;
    el.density.placeholder = custom ? "e.g. 2.4" : String(preset.density);
    el.compact.checked = preset.compacts;
    onCompact();
  }

  // The compaction percent only matters when the compaction box is ticked.
  function onCompact() {
    el.compaction.disabled = !el.compact.checked;
  }

  // Tips follow where the eye is.
  ["length", "width", "area", "len-unit", "depth", "depth-unit"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Grit) window.Grit.context("area"); });
  });
  ["material", "density"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Grit) window.Grit.context("material"); });
  });
  ["compact", "compaction", "waste", "bag-kg"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Grit) window.Grit.context("extra"); });
  });

  el.material.addEventListener("change", function () { onMaterial(false); recompute(); });
  el.compact.addEventListener("change", function () { onCompact(); recompute(); });

  // Picking a job fills the depth with the typical sub-base figure for that use
  // and ground, ticks "compacted", and explains why. The depth stays editable.
  function onUse() {
    var use = $("use").value;
    var note = $("use-note");
    if (!use) { note.hidden = true; return; }
    var d = S.typicalDepth(use, $("use-ground").value);
    if (!d) { note.hidden = true; return; }
    el.depth.value = d.mm;
    el["depth-unit"].value = "mm";
    el.compact.checked = true;
    onCompact();
    note.hidden = false;
    note.textContent = d.label + ": about " + d.mm + " mm (" + d.min + "–" + d.max + " mm). " + d.note;
    if (window.Grit) window.Grit.context("area");
  }
  $("use").addEventListener("change", function () { onUse(); recompute(); });
  $("use-ground").addEventListener("change", function () { if ($("use").value) { onUse(); recompute(); } });

  ids.forEach(function (id) {
    el[id].addEventListener("input", recompute);
    el[id].addEventListener("change", recompute);
  });

  // Open on a shared link if there is one, otherwise a sensible starting point.
  var frag = location.hash.replace(/^#/, "");
  var initial = frag ? S.unpack(frag) : null;
  if (initial) { writeState(initial); onMaterial(true); }
  else { onMaterial(false); }
  onCompact();
  recompute();
})();
