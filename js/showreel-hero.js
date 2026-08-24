// Scroll-driven "showreel" hero: chrome star -> search mockup -> neon panels -> building grid.
// Pure CSS 3D transforms + a Canvas 2D particle field, scoped to the hero's own scroll range.
(function () {
  "use strict";

  var heroSection = document.querySelector(".hero");
  var stageTrack = document.getElementById("heroStageTrack");
  var stage = heroSection && heroSection.querySelector(".hero-stage");
  var canvas = document.getElementById("showreelParticles");
  if (!heroSection || !stageTrack || !stage || !canvas) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");

  var heroContent = document.getElementById("heroContent");
  var scrollHint = document.getElementById("heroScrollHint");
  var ticks = document.querySelectorAll("#heroProgressTicks .tick");

  var acts = ["hact0", "hact1", "hact2", "hact3"].map(function (id) { return document.getElementById(id); });
  var starWrap = document.getElementById("heroStarWrap");
  var device = document.getElementById("heroDevice");
  var panelA = document.getElementById("heroPanelA");
  var panelB = document.getElementById("heroPanelB");
  var gridWrap = document.getElementById("heroGridWrap");
  var tiles = gridWrap.querySelectorAll(".tile");

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
      var alpha = 0.2 * p.depth * tw;
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

  function applyActs(p) {
    var pHero = localProgress(p, 0.00, 0.16);
    var p0 = localProgress(p, 0.00, 0.24);
    var p1 = localProgress(p, 0.16, 0.50);
    var p2a = localProgress(p, 0.42, 0.59);
    var p2b = localProgress(p, 0.59, 0.76);
    var p3 = localProgress(p, 0.72, 1.00);

    var e0 = ease(p0), e1 = ease(p1), e3 = ease(p3);
    var tiltX = reduceMotion ? 0 : pointer.y * -6;
    var tiltY = reduceMotion ? 0 : pointer.x * 6;

    // hero readable content fades out early, giving way to the showreel
    var heroFade = 1 - ease(pHero);
    heroContent.style.opacity = String(heroFade);
    heroContent.style.transform = "translateX(-50%) translateY(" + (-(1 - heroFade) * 28) + "px) scale(" + (1 - (1 - heroFade) * 0.04) + ")";
    heroContent.style.pointerEvents = heroFade < 0.15 ? "none" : "auto";

    // act 0 — chrome star
    acts[0].style.opacity = String(1 - Math.min(1, e1 * 1.15));
    var starRot = p * 220;
    var starScale = 1 - e0 * 0.2 - Math.min(0.6, e1 * 0.6);
    starWrap.style.transform =
      "translate(" + (-e1 * 24) + "vw, " + (-e1 * 12) + "vh) translateZ(" + (-e1 * 600) + "px) " +
      "rotateZ(" + starRot + "deg) rotateX(" + (tiltX + e0 * 8) + "deg) rotateY(" + (tiltY - e0 * 8) + "deg) " +
      "scale(" + Math.max(0.3, starScale) + ")";

    // act 1 — device mockup rises, settles, dives forward
    acts[1].style.opacity = String(Math.min(e1 * 1.4, 1) * (1 - Math.max(0, localProgress(p, 0.46, 0.58))));
    var deviceZ = -650 + e1 * 650 - ease(localProgress(p, 0.44, 0.58)) * 850;
    var deviceRotY = -24 + e1 * 24 + tiltY * 0.6;
    var deviceRotX = 9 - e1 * 9 + tiltX * 0.6;
    device.style.transform = "translateZ(" + deviceZ + "px) translateY(" + (36 - e1 * 36) + "px) rotateY(" + deviceRotY + "deg) rotateX(" + deviceRotX + "deg)";

    // act 2 — two neon panels flying toward camera
    var a2 = ease(p2a), b2 = ease(p2b);
    acts[2].style.opacity = String(Math.min(1, e1 * 1.2) - Math.max(0, ease(localProgress(p, 0.72, 0.80))));
    panelA.style.opacity = String(a2 < 1 ? Math.sin(Math.min(a2, 1) * Math.PI) : 0);
    panelA.style.transform = "translateZ(" + (-480 + a2 * 860) + "px) rotateX(" + (16 - a2 * 16 + tiltX) + "deg) rotateY(" + (-13 + a2 * 13 + tiltY) + "deg)";
    panelB.style.opacity = String(b2 > 0 ? Math.sin(Math.min(b2, 1) * Math.PI) : 0);
    panelB.style.transform = "translateZ(" + (-480 + b2 * 860) + "px) rotateX(" + (-15 + b2 * 15 + tiltX) + "deg) rotateY(" + (15 - b2 * 15 + tiltY) + "deg)";

    // act 3 — building grid assembles and gently floats
    acts[3].style.opacity = String(e3);
    gridWrap.style.transform = "translateZ(" + (-240 + e3 * 240) + "px) translateY(" + (56 - e3 * 56) + "px) rotateX(" + (11 - e3 * 11 + tiltX * 0.4) + "deg)";
    tiles.forEach(function (tile, i) {
      var f = Math.sin(p * 6 + i) * 5;
      var d = Math.cos(p * 4 + i * 1.4) * 3;
      tile.style.transform = "translateZ(" + (i % 3 * 5) + "px) translateY(" + (f * e3) + "px) rotateZ(" + (d * e3 * 0.35) + "deg)";
    });

    // progress ticks + scroll hint
    var activeIdx = p < 0.18 ? 0 : p < 0.5 ? 1 : p < 0.78 ? 2 : 3;
    ticks.forEach(function (t, i) { t.classList.toggle("active", i === activeIdx); });
    if (scrollHint) scrollHint.style.opacity = String(p < 0.03 ? 1 : Math.max(0, 1 - p * 14));
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
