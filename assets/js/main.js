/* 玉柴马石油 · 站点交互 */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 导航：滚动加深 + 移动端开合 */
  var nav = document.querySelector(".nav");
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add("solid");
    else nav.classList.remove("solid");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = document.querySelector(".nav-burger");
  if (burger) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  /* 进场显现 */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* 数字滚动 */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var dur = 1400, t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.childNodes[0].nodeValue = Math.round(target * eased).toLocaleString("zh-CN");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    if ("IntersectionObserver" in window && !reduced) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(function (el) {
        el.childNodes[0].nodeValue = parseFloat(el.getAttribute("data-count")).toLocaleString("zh-CN");
      });
    }
  }

  /* 签名元素：温度带点亮 */
  var band = document.querySelector(".temp-band");
  if (band) {
    if (reduced) { band.classList.add("lit"); }
    else { setTimeout(function () { band.classList.add("lit"); }, 350); }
  }

  /* 手册侧栏 scrollspy */
  var rail = document.querySelector(".side-rail");
  if (rail) {
    var links = Array.prototype.slice.call(rail.querySelectorAll("a[href^='#']"));
    var targets = links
      .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
      .filter(Boolean);
    function spy() {
      var pos = window.scrollY + 140;
      var current = targets[0];
      targets.forEach(function (sec) { if (sec.offsetTop <= pos) current = sec; });
      links.forEach(function (a) {
        a.classList.toggle("current", current && a.getAttribute("href") === "#" + current.id);
      });
    }
    window.addEventListener("scroll", spy, { passive: true });
    spy();
  }

  /* 温度范围内嵌条：根据 data-lo / data-hi 定位（全局刻度 -40 ~ 300℃） */
  document.querySelectorAll(".trange .bar i").forEach(function (bar) {
    var lo = parseFloat(bar.getAttribute("data-lo"));
    var hi = parseFloat(bar.getAttribute("data-hi"));
    var MIN = -40, MAX = 300;
    var l = Math.max(0, (lo - MIN) / (MAX - MIN) * 100);
    var r = Math.min(100, (hi - MIN) / (MAX - MIN) * 100);
    bar.style.left = l + "%";
    bar.style.width = Math.max(4, r - l) + "%";
  });
})();
