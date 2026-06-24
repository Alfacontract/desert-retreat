# MGM Cape Verde — Warm Charcoal Edition 2026

A mobile-first, SEO-optimised, high-performance landing page.
Wireframe + animation language reverse-engineered from **omaivillas.com**,
reskinned to the **MGM Cape Verde** brand (warm charcoal, mustard accents,
Montserrat, squared/editorial, "Bloomberg Terminal Luxury").

## Run locally
Any static server works (no build step):
```
python -m http.server 5599 --directory .
# open http://localhost:5599
```

## Structure
```
index.html              semantic HTML + SEO meta + JSON-LD
assets/css/style.css    design tokens + components + animation engine
assets/js/main.js       reveal (IntersectionObserver) + GSAP hero/parallax/scroll-hijack
assets/js/vendor/       GSAP + ScrollTrigger (self-hosted, no CDN)
```

## Design tokens (in `style.css` :root)
- **Palette** — Warm Charcoal `#0F1115` → surfaces `#16181D`/`#1C1F26`/`#232730`;
  light `#F5F5F3`/`#F8F8F7`/`#ECECE8`; mustard accents `#B08D57`→`#8E6E38` (KPI/highlights only).
- **Type** — Montserrat (official). Display = weight 200 at large sizes + open tracking = quiet luxury.
- **Easing** — signature `cubic-bezier(.25,.5,0,1)`, reveal `cubic-bezier(.4,0,.2,1)`.

## Animation system (faithful to the reference site)
| Effect | Trigger | Spec |
|---|---|---|
| Text reveal | `[data-animate][data-animate-text]` | translateY(40px→0) + fade, 0.7s |
| Image reveal | `[data-animate][data-animate-img]` | fade, 1.0s |
| Hero | `[data-hero-*]` | word stagger x:-20→0, then image scale 1.05→1 over 1.8s |
| Parallax | `[data-parallax="N"]` | gsap y:-N→+N, scrub .4 (≥768px) |
| Portfolio | `[data-scroll-hijack-parent]` | pinned horizontal scroll, scrub .8 (≥1024px); native scroll-snap on mobile |

`.visible` is added by IntersectionObserver; CSS does the transition.
`prefers-reduced-motion` and no-JS are both handled (content stays visible).

## Swapping in real content (later)
1. **Images** — replace the `https://picsum.photos/...?grayscale` placeholders with your own
   (keep `loading="lazy"` + `decoding="async"`; ideal sizes noted by each `aspect-ratio`).
   Image wrappers have a charcoal fallback, so a missing image degrades gracefully.
2. **Copy** — edit text directly in `index.html`; the `data-animate*` attributes drive the reveals.
3. **Fonts** — already Montserrat per brand. For production, self-host the woff2 instead of Google Fonts.
4. **KPIs** — the `.kpi` block is the place for ROI/IRR/AUM figures (mustard accent is reserved for these).

## Notes
- No framework runtime → fast first paint. Only dependency is self-hosted GSAP (~115 KB).
- Squared geometry, thin hairlines, no rounded corners, no glow — per MGM brand guidelines.
