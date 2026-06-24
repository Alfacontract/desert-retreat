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
      // GUARD: native-mode auto-scroll clones double track.scrollWidth and would double
      // the pan distance / break the pin. Clones only exist after a native -> desktop
      // crossing; this matchMedia ENTER callback fires synchronously on that crossing, so
      // stripping here runs before scrollWidth is read on the same tick. (On the first
      // desktop load the hook is still undefined, which is safe: no clones can exist yet.)
      if (typeof window.__stripGalleryClones === "function") window.__stripGalleryClones();
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

  /* 8. Auto-scroll the gallery rightward in native (mobile / minimised) mode.
        Continuous rAF marquee with a seamless clone-based wrap; NEVER runs in the
        desktop GSAP-pin mode. Exposes window.__stripGalleryClones so the pin can
        guarantee a clone-free, transform-free DOM before it reads track.scrollWidth
        (clones would otherwise double the pan distance and break the pin). */
  function initAutoScroll() {
    if (reduce) return;
    var SPEED = 34;          // px per second — gentle premium drift
    var IDLE_RESUME = 2500;  // ms after the last interaction before resuming
    var instances = [];      // teardown/sync hooks for resize + the pin guard

    document.querySelectorAll("[data-scroll-hijack-container]").forEach(function (track) {
      var sec = track.closest("[data-scroll-hijack-parent]") || track;
      var raf = null, idle = null;
      var visible = false, interacting = false, cloned = false;
      var pos = 0;           // sub-pixel scroll accumulator (scrollLeft is integer-rounded)
      var period = 0;        // one full loop of the originals, gap-exact, rounded to px
      var last = 0;

      function native() {
        return getComputedStyle(track).overflowX !== "visible" &&
               track.scrollWidth > track.clientWidth + 4;
      }
      // True while GSAP still has the section pinned (a .pin-spacer wraps it). Don't
      // measure/scroll during that brief teardown window on a desktop -> native cross.
      function pinned() {
        var sp = sec.parentElement;
        return !!(sp && sp.classList && sp.classList.contains("pin-spacer"));
      }

      // Clone the originals once so wrapping by `period` is invisible. Lazy: never
      // touches the DOM in pin mode, and clones copy fully-revealed originals. Clones
      // are inert + aria-hidden, the reveal hooks are stripped so they can't be left
      // invisible, and the first two images are pre-warmed so the wrap seam never
      // flashes a half-decoded photo.
      function buildClones() {
        if (cloned) return;
        if (track.scrollWidth <= track.clientWidth + 4) return;   // originals already fit: nothing to loop
        var originals = [].slice.call(track.children);
        if (originals.length < 2) return;
        var frag = document.createDocumentFragment();
        originals.forEach(function (card, i) {
          var c = card.cloneNode(true);
          c.setAttribute("data-clone", "");
          c.setAttribute("aria-hidden", "true");
          c.removeAttribute("id");
          c.removeAttribute("data-animate");
          c.removeAttribute("data-animate-img");                 // drop the reveal gate
          if ("inert" in c) c.inert = true;                      // out of the a11y tree + focus order
          if (i < 2) {                                           // pre-warm the seam images
            var im = c.querySelector("img");
            if (im) { im.setAttribute("loading", "eager"); if (im.decode) { im.decode().catch(function () {}); } }
          }
          frag.appendChild(c);
        });
        track.appendChild(frag);
        cloned = true;
        measure();
      }

      function stripClones() {
        pause();                                                 // never strip clones out from under a live rAF
        var clones = track.querySelectorAll("[data-clone]");
        for (var i = clones.length - 1; i >= 0; i--) clones[i].parentNode.removeChild(clones[i]);
        cloned = false;
        period = 0;
      }

      // period = first clone's left edge - first original's left edge. offsetLeft is read
      // after flex+gap layout, so it bakes in every card width AND every gap, including the
      // gap joining the last original -> first clone. Rounded so the seam maps integer
      // scrollLeft (period) -> 0 with no sub-pixel shimmer.
      function measure() {
        var firstClone = track.querySelector("[data-clone]");
        period = (firstClone && track.children.length)
          ? Math.round(firstClone.offsetLeft - track.children[0].offsetLeft)
          : 0;
      }

      function frame(now) {
        if (!raf) return;
        if (period <= 0) { pause(); return; }                    // defense: never scroll unbounded
        if (!last) last = now;
        var dt = (now - last) / 1000;                            // seconds elapsed — frame-rate independent
        last = now;
        if (dt > 0.1) dt = 0.1;                                  // clamp after a tab-switch / long frame
        pos += SPEED * dt;                                       // velocity integration in float space
        while (pos >= period) pos -= period;                     // seamless wrap; keeps the fraction
        track.scrollLeft = Math.round(pos);                      // integer write; remainder stays in pos
        raf = window.requestAnimationFrame(frame);
      }

      function play() {
        if (raf || interacting || !visible || document.hidden || !native() || pinned()) return;
        if (track.style.transform) track.style.transform = "";   // clear any stale pin transform
        buildClones();
        if (period <= 0) return;                                 // not enough content to loop
        track.classList.add("is-marquee");                       // snap OFF for the whole native session
        pos = track.scrollLeft;                                  // pick up wherever the user left it
        if (pos >= period) pos = pos % period;
        track.scrollLeft = Math.round(pos);                      // keep DOM + accumulator in sync (no period jump-back)
        last = 0;
        raf = window.requestAnimationFrame(frame);
      }

      function pause() {                                         // snap stays OFF (is-marquee kept) so a
        if (raf) { window.cancelAnimationFrame(raf); raf = null; } // paused/manual scroll never snap-jerks
      }

      // Full reset when leaving native mode (resize up to the desktop pin). Leaves a clean
      // DOM for the pin: no clones, no transform, snap restored.
      function teardown() {
        pause();
        clearTimeout(idle); idle = null;
        interacting = false;
        stripClones();
        track.classList.remove("is-marquee");                    // restore default snap for non-native layouts
        pos = 0;
        track.style.transform = "";                              // never strand a leftover pin x
      }

      function bump() {                                          // user interaction: pause, resume when idle
        interacting = true;
        pause();
        clearTimeout(idle);
        idle = setTimeout(function () { interacting = false; play(); }, IDLE_RESUME);
      }

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { visible = e.isIntersecting; if (visible) play(); else pause(); });
        }, { threshold: 0.25 }).observe(sec);
      } else {
        visible = true;
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) pause();
        else if (visible && !interacting) play();
      });

      ["pointerdown", "touchstart", "wheel"].forEach(function (ev) {
        track.addEventListener(ev, bump, { passive: true });
      });

      instances.push({
        teardown: teardown,
        sync: function () {
          if (!native()) { teardown(); return; }                 // crossed up to the desktop pin / no overflow
          stripClones();                                         // still native: rebuild for the current layout/period
          play();
        }
      });
    });

    // Authoritative hook for the GSAP pin guard: strip every track's clones + clear the
    // transform BEFORE the pin reads scrollWidth, so the pan distance is the original cards only.
    window.__stripGalleryClones = function () {
      instances.forEach(function (it) { it.teardown(); });
    };

    // Re-sync per track off a debounced resize, just AFTER the existing 250ms
    // ScrollTrigger.refresh so the pin/layout have settled first.
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { instances.forEach(function (it) { it.sync(); }); }, 260);
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
