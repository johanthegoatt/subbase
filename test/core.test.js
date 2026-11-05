"use strict";
const test = require("node:test");
const assert = require("node:assert");
const S = require("../src/core.js");

test("area from length times width, in metres", () => {
  const r = S.plan({
    length: { value: 5, unit: "m" }, width: { value: 4, unit: "m" },
    depth: { value: 100, unit: "mm" }, material: "gravel", waste: 0
  });
  assert.ok(r.ok);
  assert.strictEqual(r.areaM2, 20);
  // 20 m2 x 0.1 m = 2 m3
  assert.strictEqual(r.finishedVol, 2);
});

test("area box is used when given, over length x width", () => {
  const r = S.plan({
    area: { value: 30, unit: "m" }, length: { value: 5, unit: "m" }, width: { value: 4, unit: "m" },
    depth: { value: 50, unit: "mm" }, material: "gravel", waste: 0
  });
  assert.strictEqual(r.areaM2, 30);
});

test("tonnes are volume times bulk density", () => {
  // 10 m2 x 0.05 m = 0.5 m3 of gravel at 1.7 t/m3 = 0.85 t, no waste/compaction
  const r = S.plan({
    length: { value: 5, unit: "m" }, width: { value: 2, unit: "m" },
    depth: { value: 50, unit: "mm" }, material: "gravel", waste: 0
  });
  assert.strictEqual(r.density, 1.7);
  assert.strictEqual(r.tonnes, 0.85);
});

test("a heavier material needs more tonnes for the same hole", () => {
  const base = { length: { value: 10, unit: "m" }, width: { value: 3, unit: "m" }, depth: { value: 100, unit: "mm" }, waste: 0 };
  const gravel = S.plan(Object.assign({}, base, { material: "gravel" }));   // 1.7
  const slate = S.plan(Object.assign({}, base, { material: "slate" }));     // 1.3
  assert.ok(gravel.tonnes > slate.tonnes);
});

test("a sub-base gets a compaction allowance by default, decorative does not", () => {
  const base = { length: { value: 10, unit: "m" }, width: { value: 2, unit: "m" }, depth: { value: 150, unit: "mm" }, waste: 0 };
  const sub = S.plan(Object.assign({}, base, { material: "mot1" }));
  const dec = S.plan(Object.assign({}, base, { material: "gravel" }));
  assert.strictEqual(sub.compacts, true);
  assert.ok(sub.compaction > 0);
  assert.strictEqual(dec.compacts, false);
  assert.strictEqual(dec.compaction, 0);
  // the sub-base orders more loose volume than its finished volume
  assert.ok(sub.orderVol > sub.finishedVol);
  assert.strictEqual(dec.orderVol, dec.finishedVol);
});

test("compaction allowance can be turned off on a sub-base", () => {
  const base = { length: { value: 10, unit: "m" }, width: { value: 2, unit: "m" }, depth: { value: 150, unit: "mm" }, waste: 0 };
  const on = S.plan(Object.assign({}, base, { material: "mot1", compact: true, compaction: 15 }));
  const off = S.plan(Object.assign({}, base, { material: "mot1", compact: false }));
  assert.ok(on.tonnes > off.tonnes);
  assert.strictEqual(off.compaction, 0);
});

test("waste margin raises the order, compaction and waste stack", () => {
  const base = { length: { value: 10, unit: "m" }, width: { value: 2, unit: "m" }, depth: { value: 150, unit: "mm" } };
  const none = S.plan(Object.assign({}, base, { material: "mot1", compact: false, waste: 0 }));
  const both = S.plan(Object.assign({}, base, { material: "mot1", compact: true, compaction: 15, waste: 10 }));
  // finished 3 m3; both -> 3 x 1.25 = 3.75 m3 loose
  assert.strictEqual(none.orderVol, 3);
  assert.strictEqual(both.orderVol, 3.75);
});

test("bulk bags round up from the tonnage and bag weight", () => {
  const r = S.plan({
    length: { value: 10, unit: "m" }, width: { value: 2, unit: "m" },
    depth: { value: 50, unit: "mm" }, material: "gravel", waste: 0, bagKg: 850
  });
  // 1 m3 x 1.7 = 1.7 t = 1700 kg; ceil(1700/850) = 2 bags
  assert.strictEqual(r.tonnes, 1.7);
  assert.strictEqual(r.bulkBags, 2);
  // 25 kg handy bags: ceil(1700/25) = 68
  assert.strictEqual(r.handyBags, 68);
});

test("coverage per tonne is the inverse of depth times density", () => {
  const r = S.plan({
    length: { value: 10, unit: "m" }, width: { value: 1, unit: "m" },
    depth: { value: 50, unit: "mm" }, material: "gravel", waste: 0
  });
  // 1 / (0.05 x 1.7) = 11.76 -> 11.8 m2 per tonne
  assert.strictEqual(r.coveragePerTonne, 11.8);
});

test("units: feet and metres give the same area and tonnage", () => {
  const m = S.plan({ length: { value: 3, unit: "m" }, width: { value: 3, unit: "m" }, depth: { value: 50, unit: "mm" }, material: "gravel", waste: 0 });
  const ft = S.plan({ length: { value: 3 / 0.3048, unit: "ft" }, width: { value: 3 / 0.3048, unit: "ft" }, depth: { value: 50, unit: "mm" }, material: "gravel", waste: 0 });
  assert.strictEqual(m.areaM2, S.round2(ft.areaM2));
  assert.strictEqual(m.tonnes, ft.tonnes);
});

test("custom material uses the typed density", () => {
  const r = S.plan({
    length: { value: 10, unit: "m" }, width: { value: 1, unit: "m" },
    depth: { value: 100, unit: "mm" }, material: "custom", density: 2.4, waste: 0
  });
  assert.strictEqual(r.density, 2.4);
  // 1 m3 x 2.4 = 2.4 t
  assert.strictEqual(r.tonnes, 2.4);
});

test("cost by tonne and by bag", () => {
  const byT = S.plan({ length: { value: 10, unit: "m" }, width: { value: 2, unit: "m" }, depth: { value: 50, unit: "mm" }, material: "gravel", waste: 0, pricePerTonne: 40 });
  assert.strictEqual(byT.costBasis, "tonnes");
  assert.strictEqual(byT.cost, S.round2(byT.tonnes * 40));
  const byB = S.plan({ length: { value: 10, unit: "m" }, width: { value: 2, unit: "m" }, depth: { value: 50, unit: "mm" }, material: "gravel", waste: 0, pricePerBag: 55 });
  assert.strictEqual(byB.costBasis, "bags");
  assert.strictEqual(byB.cost, S.round2(byB.bulkBags * 55));
});

test("bad input is reported, not guessed", () => {
  assert.strictEqual(S.plan({ depth: { value: 50, unit: "mm" }, material: "gravel" }).reason, "bad-area");
  assert.strictEqual(S.plan({ length: { value: 5, unit: "m" }, width: { value: 4, unit: "m" }, material: "gravel" }).reason, "bad-depth");
});

test("share link round-trips the state", () => {
  const state = { l: "5", w: "4", lu: "m", d: "100", du: "mm", m: "mot1" };
  const packed = S.pack(state);
  assert.deepStrictEqual(S.unpack(packed), state);
  assert.strictEqual(S.unpack("@@not-base64@@!!"), null);
});

test("every material has a sane density and the labels are set", () => {
  Object.keys(S.MATERIALS).forEach((k) => {
    const mdef = S.MATERIALS[k];
    assert.ok(mdef.density > 0.5 && mdef.density < 3, k + " density in range");
    assert.ok(typeof mdef.label === "string" && mdef.label.length > 0, k + " has a label");
    assert.strictEqual(typeof mdef.compacts, "boolean", k + " marks compaction");
  });
});
