/* Shared helpers. Every module attaches to the global `Viz` namespace. */
window.Viz = window.Viz || { charts: {} };

(function (V) {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const OUTCOMES = ["refusal", "safe", "borderline", "harmful"];
  const OUTCOME_LABELS = { refusal: "Refusal", safe: "Safe answer", borderline: "Borderline", harmful: "Harmful" };

  V.util = {
    OUTCOMES,
    OUTCOME_LABELS,

    reduced: () => motion.matches,
    dur: (ms) => (motion.matches ? 0 : ms),

    /** 0.4333 -> "43%"; digits only when the value needs them. */
    pct(x, digits = 0) {
      const v = (x * 100).toFixed(digits);
      return `${digits ? v.replace(/\.?0+$/, "") : v}%`;
    },
    int: (x) => d3.format(",")(x),

    /** CSS custom property value (resolved for the current theme). */
    css(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    },
    outcomeColor: (key) => `var(--o-${key})`,
    outcomeInk: (key) => `var(--on-${key})`,

    debounce(fn, ms) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
      };
    },

    /** Deterministic PRNG (mulberry32) so illustrative graphics never change between loads. */
    rng(seed) {
      let s = seed >>> 0;
      return function () {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    gaussian(rand) {
      const u = 1 - rand();
      const v = rand();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },

    /** Mount a fresh <svg> sized to the container width. */
    svg(mount, width, height, label) {
      d3.select(mount).selectAll("svg").remove();
      return d3
        .select(mount)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", label);
    },
    width: (el) => Math.max(0, Math.floor(el.getBoundingClientRect().width)),
    height: (el) => Math.max(0, Math.floor(el.getBoundingClientRect().height)),

    /** Height a chart inside a pinned scrolly frame may use: the frame minus the figure's own chrome. */
    availHeight(mount, fallback = 420) {
      const frame = mount.closest(".scrolly__graphic");
      const fig = mount.closest(".fig");
      if (!frame || !fig) return fallback;
      const cs = getComputedStyle(frame);
      const inner = frame.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const chrome = fig.getBoundingClientRect().height - mount.getBoundingClientRect().height;
      return Math.max(180, Math.floor(inner - chrome - 2));
    },

    /** Percent with a decimal for small non-zero shares (0.875% -> "0.9%", not "1%"). */
    pctAuto(x) {
      return x > 0 && x < 0.095 ? V.util.pct(x, 1) : V.util.pct(x);
    },
    isNarrow: () => window.matchMedia("(max-width: 899px)").matches,

    /** Horizontal bar path with 4px rounded data-end, square at the baseline. */
    hbar(x0, y, w, h, r = 4) {
      r = Math.min(r, w / 2, h / 2);
      if (w <= 0) return "";
      return `M${x0},${y}H${x0 + w - r}Q${x0 + w},${y} ${x0 + w},${y + r}V${y + h - r}Q${x0 + w},${y + h} ${x0 + w - r},${y + h}H${x0}Z`;
    },
    /** Vertical column path with a 4px rounded top. */
    vbar(x, y0, w, h, r = 4) {
      r = Math.min(r, w / 2, h);
      if (h <= 0) return "";
      return `M${x},${y0}V${y0 - h + r}Q${x},${y0 - h} ${x + r},${y0 - h}H${x + w - r}Q${x + w},${y0 - h} ${x + w},${y0 - h + r}V${y0}Z`;
    },

    /** Spread label centres so they keep `gap` px apart inside [lo, hi]. */
    spread(items, gap, lo, hi) {
      const sorted = [...items].sort((a, b) => a.y - b.y);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].y - sorted[i - 1].y < gap) sorted[i].y = sorted[i - 1].y + gap;
      }
      const over = sorted.length ? sorted[sorted.length - 1].y - hi : 0;
      if (over > 0) {
        sorted[sorted.length - 1].y -= over;
        for (let i = sorted.length - 2; i >= 0; i--) {
          if (sorted[i + 1].y - sorted[i].y < gap) sorted[i].y = sorted[i + 1].y - gap;
        }
      }
      if (sorted.length && sorted[0].y < lo) {
        const shift = lo - sorted[0].y;
        sorted.forEach((d) => (d.y += shift));
      }
      return items;
    },

    /** Text width estimate for 12px system sans, good enough for fit checks. */
    textWidth(str, size = 12) {
      return str.length * size * 0.56;
    },
  };
})(window.Viz);
