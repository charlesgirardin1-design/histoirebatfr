// Scroll-driven "showreel" hero: chrome star -> light hero card -> card fan ->
// dark manifesto -> portfolio tiles -> floating thumbnails -> finale star + CTA.
// Pure CSS 3D transforms + a Canvas 2D particle field, scoped to the hero's own scroll range.
(function () {
  "use strict";

  var heroSection = document.querySelector(".hero");
  var stageTrack = document.getElementById("heroStageTrack");
  var stage = document.getElementById("heroStage");
  var canvas = document.getElementById("showreelParticles");
  if (!heroSection || !stageTrack || !stage || !canvas) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobileMq = window.matchMedia("(max-width: 780px)");
  var isMobile = mobileMq.matches;
  var onMobileChange = function (e) { isMobile = e.matches; };
  if (mobileMq.addEventListener) mobileMq.addEventListener("change", onMobileChange);
  else if (mobileMq.addListener) mobileMq.addListener(onMobileChange);
  var ctx = canvas.getContext("2d");

  var acts = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return document.getElementById("hact" + i); });
  var starWrap = document.getElementById("heroStarWrap");
  var hact1Copy = document.querySelector("#hact1 .hact1-copy");
  var photoCard = document.getElementById("heroPhotoCard");
  var fanCards = document.querySelectorAll("#heroFanWrap .fan-card");
  var hact2CtaEl = document.querySelector("#hact2 .hact2-cta");
  var hact3Big = document.querySelector("#hact3 .hact3-big");
  var hact3Para = document.querySelector("#hact3 .hact3-para");
  var hact3Cases = document.querySelector("#hact3 .hact3-cases");
  var portfolioTiles = document.querySelectorAll("#heroPortfolioWrap .portfolio-tile");
  var floatThumbs = document.querySelectorAll("#heroFloatGrid .float-thumb");
  var finaleStarWrap = document.getElementById("heroFinaleStarWrap");
  var heroContentEl = document.getElementById("heroContent");
  var ticksNav = document.getElementById("heroProgressTicks");
  var ticks = ticksNav ? ticksNav.querySelectorAll(".tick") : [];
  var scrollHint = document.getElementById("heroScrollHint");

  var DARK = [21, 8, 41];   // #150829
  var LIGHT = [253, 252, 249]; // #fdfcf9

  /* ---------------- ambient particle field ---------------- */
  var particles = [];
  var W, H, DPR;

  function resizeCanvas() {
    var rect = stage.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function seedParticles() {
    var n = Math.round((W * H) / 16000);
    particles = [];
    for (var i = 0; i < n; i++) {
      var depth = 0.3 + Math.random() * 0.7;
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: depth * 1.3,
        depth: depth,
        vy: -0.05 * depth - 0.015,
        vx: (Math.random() - 0.5) * 0.03,
        tw: Math.random() * Math.PI * 2
      });
    }
  }
  function drawParticles(t) {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) p.y = H + 10;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      var tw = 0.55 + 0.45 * Math.sin(t * 0.0012 + p.tw);
      var alpha = 0.22 * p.depth * tw;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,180,255," + alpha.toFixed(3) + ")";
      ctx.fill();
    }
  }
  resizeCanvas();
  seedParticles();
  window.addEventListener("resize", function () { resizeCanvas(); seedParticles(); onScroll(); });

  /* ---------------- pointer parallax (only while hovering the hero) ---------------- */
  var pointer = { x: 0, y: 0 }, pointerTarget = { x: 0, y: 0 };
  if (!reduceMotion) {
    heroSection.addEventListener("mousemove", function (e) {
      var rect = heroSection.getBoundingClientRect();
      pointerTarget.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerTarget.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    });
    heroSection.addEventListener("mouseleave", function () { pointerTarget.x = 0; pointerTarget.y = 0; });
  }

  /* ---------------- scroll progress across the hero's own track ---------------- */
  var scrollTarget = 0, displayProgress = 0;
  function computeScrollProgress() {
    var rect = stageTrack.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, -rect.top / total));
  }
  function onScroll() { scrollTarget = computeScrollProgress(); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function localProgress(p, start, end) { return clamp01((p - start) / (end - start)); }
  function ease(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function fadeBand(p, inStart, inEnd, outStart, outEnd) {
    return clamp01(ease(localProgress(p, inStart, inEnd)) - ease(localProgress(p, outStart, outEnd)));
  }

  function applyActs(p) {
    var tiltX = reduceMotion ? 0 : pointer.y * -6;
    var tiltY = reduceMotion ? 0 : pointer.x * 6;

    // background lightness: dark -> light (acts 1-2) -> dark
    var lightUp = ease(localProgress(p, 0.05, 0.12));
    var lightDown = ease(localProgress(p, 0.36, 0.45));
    var lightness = clamp01(lightUp - lightDown);
    var bg = [
      Math.round(lerp(DARK[0], LIGHT[0], lightness)),
      Math.round(lerp(DARK[1], LIGHT[1], lightness)),
      Math.round(lerp(DARK[2], LIGHT[2], lightness))
    ];
    stage.style.backgroundColor = "rgb(" + bg[0] + "," + bg[1] + "," + bg[2] + ")";
    canvas.style.opacity = String(clamp01(1 - lightness * 1.3));
    if (ticksNav) ticksNav.classList.toggle("on-light", lightness > 0.5);

    // act 0 — chrome star intro
    var op0 = 1 - ease(localProgress(p, 0.06, 0.12));
    acts[0].style.opacity = String(op0);
    starWrap.style.transform =
      "rotateZ(" + (p * 260) + "deg) rotateX(" + tiltX + "deg) rotateY(" + tiltY + "deg) scale(" + (1 - ease(localProgress(p, 0, 0.09)) * 0.2) + ")";

    // act 1 — light hero + tilted photo card
    var op1 = fadeBand(p, 0.03, 0.11, 0.21, 0.28);
    acts[1].style.opacity = String(op1);
    var in1 = ease(localProgress(p, 0.03, 0.12));
    var out1 = ease(localProgress(p, 0.21, 0.28));
    hact1Copy.style.transform = "translateY(" + ((1 - in1) * 26) + "px)";
    if (isMobile) {
      photoCard.style.transform =
        "translateY(" + ((1 - in1) * 18 - out1 * 40) + "px) scale(" + (0.94 + in1 * 0.06) + ")";
    } else {
      photoCard.style.transform =
        "translateY(-50%) translateZ(" + (-260 + in1 * 260 - out1 * 520) + "px) " +
        "rotateY(" + (22 - in1 * 22 + tiltY + out1 * 30) + "deg) rotateX(" + (-9 + in1 * 9 + tiltX) + "deg)";
    }

    // act 2 — light card fan
    var op2 = fadeBand(p, 0.24, 0.32, 0.40, 0.46);
    acts[2].style.opacity = String(op2);
    var in2 = ease(localProgress(p, 0.24, 0.33));
    fanCards.forEach(function (card, i) {
      var spread = i - 1; // -1, 0, 1
      var lift = i === 1 ? in2 * 34 : 0;
      card.style.transform =
        "translateX(" + (spread * 46 * in2) + "px) translateZ(" + (lift - out1 * 0) + "px) " +
        "rotateZ(" + (spread * 9 * in2) + "deg) rotateY(" + (tiltY * 0.6) + "deg)";
    });
    if (hact2CtaEl) hact2CtaEl.style.transform = "translateX(-50%) translateY(" + ((1 - in2) * 16) + "px)";

    // act 3 — dark manifesto
    var op3 = fadeBand(p, 0.44, 0.52, 0.60, 0.66);
    acts[3].style.opacity = String(op3);
    var in3 = ease(localProgress(p, 0.44, 0.53));
    hact3Big.style.transform = "translateX(" + ((1 - in3) * 50) + "px)";
    hact3Para.style.transform = "translateY(" + ((1 - in3) * 16) + "px)";
    hact3Cases.style.transform = "translateY(" + ((1 - in3) * 22) + "px)";

    // act 4 — dark portfolio, big tiles
    var op4 = fadeBand(p, 0.60, 0.68, 0.76, 0.82);
    acts[4].style.opacity = String(op4);
    var in4 = ease(localProgress(p, 0.60, 0.70));
    portfolioTiles.forEach(function (tile, i) {
      tile.style.transform = "translateY(" + ((1 - in4) * 60) + "px) translateZ(" + (i * 12) + "px) rotateY(" + (tiltY * 0.4) + "deg)";
    });

    // act 5 — floating thumbnails
    var op5 = fadeBand(p, 0.76, 0.84, 0.90, 0.94);
    acts[5].style.opacity = String(op5);
    var in5 = ease(localProgress(p, 0.76, 0.85));
    floatThumbs.forEach(function (thumb, i) {
      var f = Math.sin(p * 8 + i * 1.3) * 8;
      thumb.style.transform =
        "translateY(" + (f * in5 + (1 - in5) * 34) + "px) translateZ(" + ((i % 3) * 20) + "px) " +
        "scale(" + (0.75 + in5 * 0.25) + ")";
    });

    // act 6 — finale: big star + real headline/CTA/stats
    var in6 = ease(localProgress(p, 0.90, 1.0));
    acts[6].style.opacity = String(in6);
    finaleStarWrap.style.transform = "translateY(-50%) rotateZ(" + (p * 140) + "deg) scale(" + (0.7 + in6 * 0.3) + ")";
    heroContentEl.style.opacity = String(in6);
    heroContentEl.style.transform = "translateX(-50%) scale(" + (0.95 + in6 * 0.05) + ")";

    // progress ticks + scroll hint
    var activeIdx = p < 0.10 ? 0 : p < 0.30 ? 1 : p < 0.46 ? 2 : p < 0.62 ? 3 : p < 0.78 ? 4 : p < 0.90 ? 5 : 6;
    ticks.forEach(function (t, i) { t.classList.toggle("active", i === activeIdx); });
    if (scrollHint) scrollHint.style.opacity = String(p < 0.03 ? 1 : Math.max(0, 1 - p * 20));
  }

  applyActs(scrollTarget);
  displayProgress = scrollTarget;

  var rafId = null;
  function frame() {
    rafId = requestAnimationFrame(frame);
    pointer.x += (pointerTarget.x - pointer.x) * 0.06;
    pointer.y += (pointerTarget.y - pointer.y) * 0.06;
    displayProgress += (scrollTarget - displayProgress) * 0.12;
    applyActs(displayProgress);
    if (!reduceMotion) drawParticles(performance.now());
  }
  function start() { if (rafId === null) frame(); }
  function stop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

  if (!reduceMotion) {
    drawParticles(performance.now());
  } else {
    drawParticles(0);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { entry.isIntersecting ? start() : stop(); });
    }, { threshold: 0 }).observe(heroSection);
  } else {
    start();
  }
})();
