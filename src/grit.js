// Grit, the little pebble who helps you order the right amount of aggregate.
// Grit offers a tip when tapped, sits calm to start, smiles on an easy spread
// job, looks thoughtful on a compacted sub-base, and braces a bit when the load
// is getting heavy. Everything Grit says goes through the bubble's live region,
// so a screen reader hears it too. Moods are driven by the app, never on a timer
// of its own.
(function () {
  "use strict";
  var btn = document.getElementById("grit");
  var bubble = document.getElementById("grit-bubble");
  var dock = document.getElementById("grit-dock");
  var hide = document.getElementById("grit-hide");
  if (!btn) { window.Grit = { react: function () {}, context: function () {}, say: function () {} }; return; }

  var still = matchMedia("(prefers-reduced-motion: reduce)");
  var baseMood = "calm", tipKey = "start";
  var bubbleTimer = null, flashTimer = null, taps = [], tipAt = {};

  var TIPS = {
    start: [
      "Hi, I'm Grit! Tell me the area and how deep, and I'll tell you how many tonnes to order.",
      "Aggregate is sold by weight, not volume. I turn the hole you're filling into tonnes with the material's density.",
      "Measure the area to cover and the depth you want. Depth is usually in millimetres."
    ],
    area: [
      "Give me a length and width, or type the area straight in if you already have it.",
      "For an odd shape, split it into rectangles, add them up, and put the total in the area box.",
      "A driveway sub-base is usually 100 to 150 mm; a decorative gravel topping is more like 40 to 50 mm."
    ],
    material: [
      "A cubic metre of MOT Type 1 weighs about 2 tonnes; light slate chippings are nearer 1.3. The density is what turns volume into tonnes.",
      "Not sure of the density? Check the supplier's product page and type their figure into Custom.",
      "A heavier stone means more tonnes for the same hole, so the material matters as much as the size."
    ],
    extra: [
      "A sub-base is whacked down and loses height, so I add a bit extra to reach your depth once it's compacted.",
      "Decorative gravel isn't compacted, so it gets no compaction allowance, just a small waste margin.",
      "A bulk bag can settle below its stated weight, so a little over is normal, not a mistake."
    ],
    result: [
      "Order from one supplier so the colour and grade match across every bag.",
      "Lay and compact a sub-base in layers no more than about 100 mm at a time.",
      "Compare my coverage-per-tonne with the supplier's own figure; if theirs differs, use their density."
    ]
  };

  function setMood(m) { btn.setAttribute("data-mood", m); }

  function say(text, ms) {
    if (dock.classList.contains("tucked")) return;
    bubble.textContent = text;
    bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.classList.add("pop");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.textContent = ""; }, ms || 7000);
  }

  function flash(m, ms) {
    setMood(m);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { setMood(baseMood); }, ms || 1500);
  }

  function tip() {
    var list = TIPS[tipKey] || TIPS.start;
    var i = tipAt[tipKey] || 0;
    say(list[i % list.length]);
    tipAt[tipKey] = i + 1;
  }

  // A quick puff of dust when Grit is tapped fast, like a pebble dropped on a pile.
  function dust() {
    if (still.matches) return;
    var rect = btn.getBoundingClientRect();
    for (var i = 0; i < 7; i++) {
      (function (n) {
        var s = document.createElement("span");
        s.className = "dust";
        s.style.left = (rect.left + 22) + "px";
        s.style.top = (rect.top + 26) + "px";
        s.style.setProperty("--dx", (Math.random() * 150 - 75) + "px");
        s.style.setProperty("--dy", (-30 - Math.random() * 70) + "px");
        s.style.animationDelay = (n * 0.04) + "s";
        document.body.appendChild(s);
        setTimeout(function () { s.remove(); }, 1100);
      })(i);
    }
  }

  btn.addEventListener("click", function () {
    var now = Date.now();
    taps = taps.filter(function (t) { return now - t < 900; });
    taps.push(now);
    if (taps.length >= 5) { taps = []; dust(); say("Packed down tight! Right, where were we?"); flash("happy"); return; }
    tip();
    flash("think", 900);
  });

  hide.addEventListener("click", function () {
    var tucked = dock.classList.toggle("tucked");
    hide.textContent = tucked ? "" : "tuck away";
    if (!tucked) { say("Back! Tap me any time for a tip."); }
  });

  // Eyes track the pointer a little, so Grit feels awake. Cheap, eyes only.
  if (!still.matches) {
    document.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      var dx = Math.max(-2, Math.min(2, (e.clientX - (r.left + r.width / 2)) / 60));
      var face = btn.querySelector(".grit-face");
      if (face) face.style.transform = "translateX(" + dx + "px)";
    }, { passive: true });
  }

  // Public hooks the page calls.
  window.Grit = {
    // Where the user is, so the next tip fits: "area", "material", "extra".
    context: function (key) { tipKey = TIPS[key] ? key : "start"; baseMood = "calm"; setMood(baseMood); },
    // React to a result: "light", "heavy", "sub", "bad".
    react: function (kind) {
      tipKey = "result";
      if (kind === "sub") { flash("think"); say("Sub-base: I've added a compaction allowance so it still reaches depth once it's whacked down."); }
      else if (kind === "heavy") { flash("warn"); say("That's a heavy load. It'll come on a tipper or in bulk bags, not loose in the boot."); }
      else if (kind === "light") { flash("happy"); say("Nice easy spread. Just rake it level to depth."); }
      else if (kind === "bad") { flash("think"); say("I couldn't read those. Check the area and the depth?"); }
    },
    say: say
  };

  setTimeout(function () { if (!dock.classList.contains("tucked")) say(TIPS.start[0]); }, 900);
})();
