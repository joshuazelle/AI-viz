/* 1,000 prompts as 10 x (10 x 10) dot grids. Scroll steps recolour and re-sort the dots:
   neutral -> severity -> baseline outcome -> ablated outcome -> refusals that survive. */
(function (V) {
  const U = V.util;

  V.charts.waffle = function (fig, data) {
    const mount = fig.querySelector(".chart");
    const legendEl = fig.querySelector(".legend");
    const meta = data.meta;
    const catOrder = data.heatmap.categories.map((c) => c.key);
    const catLabel = Object.fromEntries(meta.categories.map((c) => [c.key, c]));
    const styleLabel = meta.styles.map((s) => s.label);
    const sevLabel = Object.fromEntries(meta.severities.map((s) => [s.key, s.label]));

    const units = data.units.rows.map(([c, sev, st, sc, b, a], i) => ({
      i,
      cat: meta.categories[c].key,
      sev,
      style: styleLabel[st],
      base: U.OUTCOMES[b],
      abl: U.OUTCOMES[a],
    }));
    const byCat = d3.group(units, (u) => u.cat);
    const persists = (u) => u.base === "refusal" && u.abl === "refusal";
    const rank = (k) => U.OUTCOMES.indexOf(k);

    const STATES = [
      {
        color: () => U.css("--dot-neutral"),
        key: (u) => u.sev,
        stat: (us) => `${us.length} requests`,
        legend: () => V.legend.render(legendEl, [{ label: "one request", color: "var(--dot-neutral)", value: "1,000" }]),
      },
      {
        color: (u) => U.css(`--sev-${u.sev}`),
        key: (u) => u.sev,
        stat: (us) => `${us.filter((u) => u.sev === 3).length} severe`,
        legend: () =>
          V.legend.render(
            legendEl,
            meta.severities.map((s) => ({ label: s.label, color: `var(--sev-${s.key})`, value: U.int(s.n) })),
            "Severity"
          ),
      },
      {
        color: (u) => U.css(`--o-${u.base}`),
        key: (u) => rank(u.base) * 10 + u.sev,
        stat: (us) => `${us.filter((u) => u.base === "refusal").length} refused`,
        legend: () => V.legend.outcomes(legendEl, data.counts.baseline, "Before"),
      },
      {
        color: (u) => U.css(`--o-${u.abl}`),
        key: (u) => rank(u.abl) * 10 + u.sev,
        stat: (us) => `${us.filter((u) => u.abl === "harmful").length} harmful`,
        legend: () => V.legend.outcomes(legendEl, data.counts.ablation, "After ablation"),
      },
      {
        color: (u) => (persists(u) ? U.css("--o-refusal") : U.css("--dot-faint")),
        key: (u) => (persists(u) ? 0 : 1 + rank(u.abl)) * 10 + u.sev,
        stat: (us) => `${us.filter(persists).length} still refused`,
        legend: () =>
          V.legend.render(legendEl, [
            { label: "refused before and after", color: "var(--o-refusal)", value: String(data.persistent.n) },
            { label: "everything else", color: "var(--dot-faint)" },
          ]),
      },
    ];

    let step = 0;
    let svg = null;
    let geo = null;
    let slots = {};

    function layout(w, h) {
      const narrow = w < 560;
      const cols = 5;
      const rows = 2;
      const labelH = narrow ? 30 : 38;
      const gapX = narrow ? 8 : 20;
      const gapY = narrow ? 10 : 22;
      const pitchW = (w - gapX * (cols - 1)) / cols / 10;
      const pitchH = (h - rows * labelH - gapY * (rows - 1)) / rows / 10;
      const pitch = Math.max(4, Math.min(pitchW, pitchH, 15));
      const panel = pitch * 10;
      const totalW = cols * panel + gapX * (cols - 1);
      const totalH = rows * (labelH + panel) + gapY * (rows - 1);
      const x0 = Math.max(0, (w - totalW) / 2);
      const y0 = 0;
      const panels = {};
      catOrder.forEach((cat, k) => {
        const col = k % cols;
        const row = Math.floor(k / cols);
        panels[cat] = {
          x: x0 + col * (panel + gapX),
          y: y0 + row * (labelH + panel + gapY) + labelH,
        };
      });
      return { narrow, pitch, panel, panels, labelH, height: Math.ceil(totalH), r: Math.max(1.6, pitch * 0.36) };
    }

    function assign(state) {
      slots = {};
      for (const [cat, us] of byCat) {
        const sorted = [...us].sort((a, b) => state.key(a) - state.key(b) || a.i - b.i);
        slots[cat] = sorted;
        sorted.forEach((u, s) => (u.slot = s));
      }
    }
    const cx = (u) => geo.panels[u.cat].x + ((u.slot % 10) + 0.5) * geo.pitch;
    const cy = (u) => geo.panels[u.cat].y + (Math.floor(u.slot / 10) + 0.5) * geo.pitch;

    function render() {
      const w = U.width(mount);
      geo = layout(w, U.availHeight(mount, 520));
      const h = geo.height;
      svg = U.svg(mount, w, h, "One thousand requests as dots in ten category grids, coloured by the current step.");
      const state = STATES[step];
      assign(state);

      const labels = svg
        .append("g")
        .selectAll("g")
        .data(catOrder)
        .join("g")
        .attr("transform", (c) => `translate(${geo.panels[c].x},${geo.panels[c].y - geo.labelH})`);
      labels
        .append("text")
        .attr("class", "t-strong")
        .attr("y", geo.narrow ? 11 : 14)
        .style("font-size", geo.narrow ? "10.5px" : "12.5px")
        .text((c) => (geo.narrow || U.textWidth(catLabel[c].label, 12.5) > geo.panel + 6 ? catLabel[c].short : catLabel[c].label));
      labels
        .append("text")
        .attr("class", "wf-stat t-muted t-num")
        .attr("y", geo.narrow ? 24 : 30)
        .style("font-size", geo.narrow ? "10px" : "11.5px");

      svg
        .append("g")
        .attr("class", "wf-dots")
        .selectAll("circle")
        .data(units, (u) => u.i)
        .join("circle")
        .attr("r", geo.r)
        .attr("cx", cx)
        .attr("cy", cy)
        .style("fill", state.color);

      svg
        .append("rect")
        .attr("class", "hit")
        .attr("width", w)
        .attr("height", h)
        .on("pointermove", hover)
        .on("pointerleave", () => V.tooltip.hide());

      update(false);
    }

    function hover(event) {
      const [mx, my] = d3.pointer(event);
      for (const cat of catOrder) {
        const p = geo.panels[cat];
        if (mx < p.x || mx >= p.x + geo.panel || my < p.y || my >= p.y + geo.panel) continue;
        const slot = Math.floor((my - p.y) / geo.pitch) * 10 + Math.floor((mx - p.x) / geo.pitch);
        const u = slots[cat][slot];
        if (!u) break;
        V.tooltip.show(event, {
          title: catLabel[cat].label,
          rows: [
            { value: U.OUTCOME_LABELS[u.base], label: "before", color: U.outcomeColor(u.base), dot: true },
            { value: U.OUTCOME_LABELS[u.abl], label: "after ablation", color: U.outcomeColor(u.abl), dot: true },
          ],
          note: `${sevLabel[u.sev]} · ${u.style}`,
        });
        return;
      }
      V.tooltip.hide();
    }

    function update(animate) {
      if (!svg) return;
      const state = STATES[step];
      assign(state);
      const dur = animate ? U.dur(700) : 0;
      svg
        .selectAll(".wf-dots circle")
        .transition()
        .duration(dur)
        .delay((u) => (animate ? catOrder.indexOf(u.cat) * 35 + u.slot * 1.2 : 0))
        .ease(d3.easeCubicInOut)
        .attr("cx", cx)
        .attr("cy", cy)
        .style("fill", state.color);
      svg.selectAll(".wf-stat").text((c) => state.stat(byCat.get(c)));
      state.legend();
    }

    render();

    return {
      render,
      step(i) {
        step = Math.min(i, STATES.length - 1);
        update(true);
      },
      table: () => ({
        caption: "Requests per category and what happened to them (counts out of 100).",
        columns: ["Category", "Severe", "Refused before", "Harmful before", "Refused after", "Harmful after", "Refused both times"],
        rows: catOrder.map((c) => {
          const us = byCat.get(c);
          const n = (f) => String(us.filter(f).length);
          return [
            catLabel[c].label,
            n((u) => u.sev === 3),
            n((u) => u.base === "refusal"),
            n((u) => u.base === "harmful"),
            n((u) => u.abl === "refusal"),
            n((u) => u.abl === "harmful"),
            n(persists),
          ];
        }),
      }),
    };
  };
})(window.Viz);
