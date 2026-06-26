/* =================================================================
   MGM CAPE VERDE — interaction engine
   - IntersectionObserver reveal (.visible)  -> CSS transitions
   - IntersectionObserver header state (no scroll listener; taste-skill §5.D)
   - GSAP hero reveal timeline (kicker stagger + 1.8s image settle)
   - GSAP parallax [data-parallax]            (>=768px)
   - GSAP pinned horizontal pan               (tall viewports)
   ================================================================= */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PIN_QUERY = "(min-height:600px)";

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
  function enablePinnedSwipe(parent, track, st) {
    if (!window.PointerEvent || track.__spacesSwipeReady) return;
    track.__spacesSwipeReady = true;

    var pointerId = null, startX = 0, startY = 0, startScroll = 0, locked = false;
    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
    function active() {
      return st && st.start !== st.end &&
        parent.parentElement &&
        parent.parentElement.classList.contains("pin-spacer");
    }
    function endDrag() {
      pointerId = null;
      locked = false;
      parent.classList.remove("is-swipe-panning");
    }

    track.addEventListener("dragstart", function (e) { e.preventDefault(); });
    track.addEventListener("pointerdown", function (e) {
      if (!active() || (e.pointerType === "mouse" && e.button !== 0)) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startScroll = window.scrollY || window.pageYOffset;
      locked = false;
      if (track.setPointerCapture) {
        try { track.setPointerCapture(pointerId); } catch (err) {}
      }
    }, { passive: true });

    track.addEventListener("pointermove", function (e) {
      if (pointerId !== e.pointerId || !active()) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      var ax = Math.abs(dx);
      var ay = Math.abs(dy);
      if (!locked) {
        if (ax < 8 && ay < 8) return;
        if (ax <= ay * 1.15) return;
        locked = true;
        parent.classList.add("is-swipe-panning");
      }
      e.preventDefault();
      window.scrollTo(0, clamp(startScroll - dx, st.start, st.end));
      if (window.ScrollTrigger) window.ScrollTrigger.update();
    }, { passive: false });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) {
      track.addEventListener(ev, endDrag, { passive: true });
    });
  }

  function initHijack() {
    var parents = document.querySelectorAll("[data-scroll-hijack-parent]");
    if (reduce || !window.gsap || !window.ScrollTrigger) {
      parents.forEach(function (p) { p.classList.add("no-pin"); });  // native horizontal scroll
      return;
    }
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    gsap.matchMedia().add(PIN_QUERY, function () {
      // GUARD: native-mode auto-scroll clones double track.scrollWidth and would double
      // the pan distance / break the pin. Clones only exist after a native -> desktop
      // crossing; this matchMedia ENTER callback fires synchronously on that crossing, so
      // stripping here runs before scrollWidth is read on the same tick. (On the first
      // desktop load the hook is still undefined, which is safe: no clones can exist yet.)
      if (typeof window.__stripGalleryClones === "function") window.__stripGalleryClones();
      parents.forEach(function (parent) {
        var track = parent.querySelector("[data-scroll-hijack-container]");
        if (!track) return;
        if (track.scrollWidth - track.clientWidth <= 0) return;
        // Function-based distance so invalidateOnRefresh RE-MEASURES the pan on every
        // resize. A static x/end keeps the old width's pan distance after a resize, which
        // leaves the pinned gallery mis-sized / seemingly unrendered — the resize bug.
        var amount = function () { return Math.max(0, track.scrollWidth - track.clientWidth); };
        var tween = gsap.to(track, {
          x: function () { return -amount(); }, ease: "none",
          scrollTrigger: {
            trigger: parent, start: "top top", end: function () { return "+=" + amount(); },
            scrub: 0.8, pin: true, pinSpacing: true, anticipatePin: 1, invalidateOnRefresh: true
          }
        });
        enablePinnedSwipe(parent, track, tween.scrollTrigger);
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
        var ox = getComputedStyle(track).overflowX;
        if (ox !== "auto" && ox !== "scroll") return;                       // only the plain native scroller (no pin, no marquee)
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
      var pos = 0;           // sub-pixel transform position — the float source of truth
      var period = 0;        // one full loop of the originals, gap-exact (sub-pixel)
      var last = 0;
      var marqueeTransform = false;   // true while OUR translate3d owns track.style.transform (vs GSAP's pin)

      function native() {
        return !window.matchMedia(PIN_QUERY).matches &&
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
      // gap joining the last original -> first clone. Kept as an EXACT sub-pixel float — the
      // GPU transform renders fractional px, so the seam is pixel-perfect and never shimmers.
      function measure() {
        var firstClone = track.querySelector("[data-clone]");
        period = (firstClone && track.children.length)
          ? (firstClone.offsetLeft - track.children[0].offsetLeft)
          : 0;
      }

      // Drive the loop with a GPU translate3d, NOT scrollLeft. scrollLeft is integer-snapped
      // per CSS pixel, so at ~0.5px/frame it stair-steps ("tik") and snap can re-fire ("mipare")
      // — exactly the mobile jank. A composited sub-pixel transform is buttery, like the desktop pin.
      function frame(now) {
        if (!raf) return;
        if (period <= 0) { pause(); return; }                    // defense: never run unbounded
        if (!last) last = now;
        var dt = (now - last) / 1000;                            // seconds elapsed — frame-rate independent
        last = now;
        if (dt > 0.1) dt = 0.1;                                  // clamp after a tab-switch / long frame
        pos += SPEED * dt;                                       // velocity integration in float space
        while (pos >= period) pos -= period;                     // seamless wrap; keeps the fraction
        track.style.transform = "translate3d(" + (-pos) + "px,0,0)";
        marqueeTransform = true;
        raf = window.requestAnimationFrame(frame);
      }

      function play() {
        if (raf || interacting || !visible || document.hidden || !native() || pinned()) return;
        if (!cloned && track.scrollWidth <= track.clientWidth + 4) return;            // originals already fit
        if (!marqueeTransform && track.style.transform) track.style.transform = "";   // clear a stale pin transform (native side)
        track.classList.add("is-marquee");                       // snap OFF before cloning, so appending
        buildClones();                                           // clones can't trigger a scroll-snap re-adjust jump at the start
        if (period <= 0) { track.classList.remove("is-marquee"); return; }
        if (pos >= period) pos = pos % period;                   // pos is the persistent float position (survives pauses)
        last = 0;
        raf = window.requestAnimationFrame(frame);
      }

      function pause() {                                         // freeze in place; is-marquee + transform kept,
        if (raf) { window.cancelAnimationFrame(raf); raf = null; } // so resume continues smoothly with no jump
      }

      // Full reset when leaving native mode (resize up to the desktop pin). Leaves a clean
      // DOM for the pin: no clones, no marquee transform, snap + overflow restored.
      function teardown() {
        pause();
        clearTimeout(idle); idle = null;
        interacting = false;
        stripClones();
        track.classList.remove("is-marquee");                    // restore default snap + overflow for non-native layouts
        pos = 0;
        // Clear ONLY our own marquee transform. At desktop the inline transform belongs to
        // GSAP's pin (teardown also runs on every desktop resize via sync) — wiping that would
        // stomp the active pan, so we guard on marqueeTransform.
        if (marqueeTransform) { track.style.transform = ""; marqueeTransform = false; }
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
