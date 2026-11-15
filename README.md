# Subbase

How many tonnes of aggregate a job really needs, and why "length times width times depth" undercounts it.

Aggregate is sold and priced by the tonne, but a job is measured in volume. The bridge is the material's bulk density, how heavy a cubic metre of it is: a cubic metre of MOT Type 1 weighs about two tonnes, light slate chippings nearer 1.3, so the same hole needs very different tonnage. A sub-base adds a second step: it goes down loose and is compacted with a plate, losing roughly a tenth of its height, so you order extra loose material to end up at the depth you want. Subbase works out the finished volume, the loose volume to order, the tonnes, the bulk bags and a waste margin.

Everything runs in your browser. Nothing you type is uploaded.

**Live:** https://subbase.johanthegoat.xyz

## What it does

- **Tonnes, not just volume.** Finished volume is the area times the depth; the tonnes are that volume (plus allowances) times the material's bulk density. Heavier stone means more tonnes for the same hole.
- **Compaction allowance.** Tick "compacted to depth" for a sub-base and it adds a compaction percent (default 15%) so the loose material still reaches your finished depth once it's whacked down. Decorative gravel is spread and raked, so it gets none.
- **Materials.** MOT Type 1, crushed stone / scalpings, all-in ballast, gravel / shingle, pea gravel, sharp and soft sand, slate chippings and topsoil, each with a typical density, plus a Custom material where you type the supplier's figure.
- **Laying course.** Block paving and slabs sit on a sharp-sand bed on top of the sub-base, usually 30–50 mm, which is easy to forget when ordering. Tick it and the bedding-sand tonnage is worked out over the same area (sharp sand ~1.6 t/m³), so you order it all at once. Depths follow Pavingexpert's block-paving and flag-laying guides.
- **Bulk bags and cost.** Turns the tonnage into bulk (dumpy) bags at an editable weight (default 850 kg) and handy 25 kg bags, and costs it per tonne or per bag.
- **Coverage check.** Shows the coverage per tonne at your depth, so you can check it against a supplier's "one tonne covers X m² at Y mm" line and use their density if it differs.
- **Share link.** Copies a link that reopens on the same job. The whole input lives in the URL fragment, which the browser never sends to a server.
- **Grit**, the pebble, offers a tip for wherever you are and reacts to the result.

## The method

Finished volume is area × depth. The loose volume to order is that volume raised by the waste margin (default 10%) and, for a compacted sub-base, the compaction allowance (default 15%). Tonnes are the loose volume times the bulk density. Bulk bags round up from the tonnage and the bag weight. Coverage per tonne at a depth is `1 / (depth × density)`.

Densities are mid-range figures from UK aggregate suppliers and shift with moisture and the exact stone, so they are all editable and the supplier's own density should win when you place the order.

## Sources

- Bulk density ranges (MOT Type 1 ~1.9–2.1 t/m³, gravel ~1.6–1.8, sand ~1.5–1.7, bulk bag ~850 kg–1 t): [Mainland Aggregates — how to calculate quantities](https://www.mainlandaggregates.co.uk/blog/how-to-calculate-the-right-quantity-of-aggregates-for-your-next-job.html) and the [20mm all-in ballast](https://www.mainlandaggregates.co.uk/quarried-aggregates/quarried-building-sands-ballast/20mm-all-in-ballast.html) product page (~1.8 t/m³).
- Compaction losing roughly 8–15% of volume on MOT Type 1, so loose material is ordered over the finished depth: general groundworks practice, as described on supplier sub-base pages (e.g. [Armstrongs — MOT Type 1 sub-base](https://www.armstrongsgroup.com/mot-type-1-sub-base-what-it-is-uses-how-much-you-need/)).

## Develop

```
npm test
```

The engine in `src/core.js` has no DOM, so it runs under `node --test`. The page is `index.html` with `src/app.js` for the glue and `src/grit.js` for the mascot. No build step, no dependencies.

## Licence

MIT
