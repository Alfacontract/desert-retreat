/* =================================================================
   MGM CAPE VERDE — interaction engine
   - IntersectionObserver reveal (.visible)  -> CSS transitions
   - IntersectionObserver header state (no scroll listener; taste-skill §5.D)
   - GSAP hero reveal timeline (kicker stagger + 1.8s image settle)
   - GSAP parallax [data-parallax]            (>=768px)
   - GSAP pinned horizontal pan               (>=1024px)
   ================================================================= */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1. SCROLL REVEAL */
  function initReveal() {
    var els = document.querySelectorAll("[data-animate]");
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("visible");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });

    // Horizontal-pan cards can sit off-screen to the right, so reveal every
    // animated element of a pan section as soon as the SECTION enters view.
    document.querySelectorAll("[data-scroll-hijack-parent]").forEach(function (sec) {
      var so = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        sec.querySelectorAll("[data-animate]").forEach(function (el) {
          el.classList.add("visible"); io.unobserve(el);
        });
        so.disconnect();
      }, { rootMargin: "0px 0px -5% 0px", threshold: 0.05 });
      so.observe(sec);
    });

    // Safety net: nothing in (or above) the viewport may stay invisible.
    window.addEventListener("load", function () {
      setTimeout(function () {
        document.querySelectorAll("[data-animate]:not(.visible)").forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("visible");
        });
      }, 200);
    });
  }

  /* 2. HEADER state via sentinel (no scroll listener) */
  function initHeader() {
    var header = document.getElementById("header");
    var sentinel = document.getElementById("top-sentinel");
    if (!header || !sentinel || !("IntersectionObserver" in window)) {
      if (header) header.classList.add("scrolled");
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      header.classList.toggle("scrolled", !entries[0].isIntersecting);
    }, { rootMargin: "-8px 0px 0px 0px", threshold: 0 });
    io.observe(sentinel);
  }

  /* 3. HERO reveal timeline */
  function initHero() {
    var img    = document.querySelector("[data-hero-img] img");
    var words  = document.querySelectorAll("[data-hero-kicker] .word");
    var title  = document.querySelector("[data-hero-title]");
    var cta    = document.querySelector("[data-hero-cta]");
    var metas  = document.querySelectorAll("[data-hero-meta]");

    if (reduce || !window.gsap) {
      if (img) { img.style.opacity = 1; img.style.transform = "scale(1)"; }
      [title, cta].concat([].slice.call(words)).concat([].slice.call(metas))
        .forEach(function (el) { if (el) el.style.opacity = 1; });
      return;
    }
    var gsap = window.gsap;
    gsap.set(img,   { autoAlpha: 0, scale: 1.06 });
    gsap.set(words, { autoAlpha: 0, x: -20 });
    gsap.set(title, { autoAlpha: 0, y: 40 });
    gsap.set(cta,   { autoAlpha: 0, y: 24 });
    gsap.set(metas, { autoAlpha: 0, y: 18 });

    var tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.to(img,   { autoAlpha: 1, scale: 1, duration: 1.8, ease: "power3.out" }, 0)
      .to(words, { autoAlpha: 1, x: 0, duration: 1, stagger: 0.1 }, 0.45)
      .to(title, { autoAlpha: 1, y: 0, duration: 1.1, ease: "power3.out" }, 0.6)
      .to(cta,   { autoAlpha: 1, y: 0, duration: 0.9 }, 0.95)
      .to(metas, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, 1.05);
  }

  /* 4. PARALLAX */
  function initParallax() {
    if (reduce || !window.gsap || !window.ScrollTrigger || window.innerWidth < 768) return;
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    document.querySelectorAll("[data-parallax]").forEach(function (el) {
      var n = parseInt(el.getAttribute("data-parallax"), 10) || 25;
      gsap.fromTo(el, { y: -n }, {
        y: n, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.4, invalidateOnRefresh: true }
      });
    });
  }

  /* 5. PINNED HORIZONTAL PAN — scoped with matchMedia so the transform
        auto-reverts when the viewport drops below desktop (fixes mobile/resize) */
  function initHijack() {
    var parents = document.querySelectorAll("[data-scroll-hijack-parent]");
    if (reduce || !window.gsap || !window.ScrollTrigger) {
      parents.forEach(function (p) { p.classList.add("no-pin"); });  // native horizontal scroll
      return;
    }
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    gsap.matchMedia().add("(min-width:1024px) and (min-height:600px)", function () {
      parents.forEach(function (parent) {
        var track = parent.querySelector("[data-scroll-hijack-container]");
        if (!track) return;
        var overflow = track.scrollWidth - track.clientWidth;
        if (overflow <= 0) return;
        gsap.to(track, {
          x: -overflow, ease: "none",
          scrollTrigger: {
            trigger: parent, start: "top top", end: "+=" + overflow,
            scrub: 0.8, pin: true, pinSpacing: true, anticipatePin: 1, invalidateOnRefresh: true
          }
        });
      });
      // matchMedia auto-reverts these tweens (clears the track transform) below the breakpoint
    });
  }

  /* 6. LOCATION MAP (Leaflet + CARTO tiles, no API key) */
  function initMap() {
    var el = document.getElementById("map");
    if (!el || typeof L === "undefined") return;
    var lat = 16.1694167, lng = -22.9097778; // Desert Retreat — exact site, Sal Rei, Boa Vista
    var map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([lat, lng], 15);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd", maxZoom: 19, attribution: "&copy; OpenStreetMap, &copy; CARTO"
    }).addTo(map);
    L.marker([lat, lng], {
      icon: L.divIcon({ className: "", html: '<div class="map-pin"></div>', iconSize: [14, 14], iconAnchor: [7, 7] })
    }).addTo(map);
    setTimeout(function () { map.invalidateSize(); }, 300);
    window.addEventListener("load", function () { map.invalidateSize(); });
  }

  /* 7. Native gallery: convert vertical wheel to horizontal scroll (mobile / minimised only) */
  function initTrackWheel() {
    document.querySelectorAll("[data-scroll-hijack-container]").forEach(function (track) {
      track.addEventListener("wheel", function (e) {
        if (getComputedStyle(track).overflowX === "visible") return;        // pinned (GSAP) mode → ignore
        if (track.scrollWidth <= track.clientWidth) return;
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;               // already a horizontal gesture
        var atStart = track.scrollLeft <= 0;
        var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
        if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;   // release to page scroll at the edges
        track.scrollLeft += e.deltaY;
        e.preventDefault();
      }, { passive: false });
    });
  }

  /* 8. Auto-scroll the gallery rightward in native (mobile / minimised) mode */
  function initAutoScroll() {
    if (reduce) return;
    document.querySelectorAll("[data-scroll-hijack-container]").forEach(function (track) {
      var sec = track.closest("[data-scroll-hijack-parent]") || track;
      var timer = null, idle = null, visible = false;
      function native() { return getComputedStyle(track).overflowX !== "visible" && track.scrollWidth > track.clientWidth + 4; }
      function advance() {
        if (!visible || !native()) return;
        if (track.style.transform) track.style.transform = "";          // clear any leftover pin transform
        var tl = track.getBoundingClientRect().left, cur = track.scrollLeft, target = 0;
        for (var i = 0; i < track.children.length; i++) {
          var p = track.children[i].getBoundingClientRect().left - tl + cur;
          if (p > cur + 6) { target = p; break; }                       // next card; falls back to 0 = loop
        }
        track.scrollTo({ left: target, behavior: "smooth" });
      }
      function start() { if (!timer && native()) timer = setInterval(advance, 3000); }
      function stop() { clearInterval(timer); timer = null; }
      function bump() { stop(); clearTimeout(idle); idle = setTimeout(start, 5000); }   // pause on interaction, resume when idle
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { visible = e.isIntersecting; if (visible) start(); else stop(); });
      }, { threshold: 0.25 }).observe(sec);
      ["pointerdown", "touchstart", "wheel"].forEach(function (ev) { track.addEventListener(ev, bump, { passive: true }); });
    });
  }

  function boot() {
    initReveal(); initHeader(); initHero(); initParallax(); initHijack(); initMap(); initTrackWheel(); initAutoScroll();
    if (window.ScrollTrigger) {
      window.addEventListener("load", function () { window.ScrollTrigger.refresh(); });
      var t;
      window.addEventListener("resize", function () {
        clearTimeout(t);
        t = setTimeout(function () { window.ScrollTrigger.refresh(); }, 250);
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
