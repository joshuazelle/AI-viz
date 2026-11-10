/* Harmful-answer rate by category x severity, baseline next to ablation on one shared scale. */
(function (V) {
  const U = V.util;
  const SMALL_N = 10;

  V.charts.heatmap = function (fig, data) {
    const mount = fig.querySelector(".chart");
    const legendEl = fig.querySelector(".legend");
    const H = data.heatmap;
    const cats = H.categories;
    const sevs = H.severities;
    const shortLabel = Object.fromEntries(data.meta.categories.map((c) => [c.key, c.short]));
    const cols = [...sevs.map((s) => ({ key: s.key, label: s.label })), { key: "all", label: "All" }];
    const cell = (cond, cat, sev) =>
      sev === "all"
        ? { ...H.totals[cond][cat], condition: cond, category: cat, severity: "all" }
        : H.cells.find((c) => c.condition === cond && c.category === cat && c.severity === sev);

    const ramp = () => {
      const stops = [0, 1, 2, 3].map((i) => U.css(`--heat-${i}`));
      return d3.scaleLinear([0, 0.33, 0.66, 1], stops).interpolate(d3.interpolateLab).clamp(true);
    };
    const inkOn = (fill) => (d3.hcl(fill).l < 58 ? "#ffffff" : "#0b0b0b");

    function legend(color) {
      legendEl.replaceChildren();
      const title = document.createElement("span");
      title.className = "legend__title";
      title.textContent = "Share judged harmful";
      const bar = document.createElement("span");
      bar.className = "legend__ramp";
      bar.style.background = `linear-gradient(90deg, ${d3.range(0, 1.01, 0.1).map((t) => color(t)).join(",")})`;
      const scale = document.createElement("span");
      scale.className = "legend__item";
      const lo = document.createElement("span");
      lo.textContent = "0%";
      const hi = document.createElement("span");
      hi.textContent = "100%";
      scale.append(lo, bar, hi);
      const note = document.createElement("span");
      note.className = "legend__title";
      note.textContent = `· faded cells: fewer than ${SMALL_N} requests`;
      legendEl.append(title, scale, note);
    }

    function render() {
      const w = U.width(mount);
      const narrow = w < 640;
      const color = ramp();
      legend(color);
      const labelW = narrow ? 84 : 150;
      const panelGap = narrow ? 0 : 36;
      const allGap = 6;
      const panelsAcross = narrow ? 1 : 2;
      const cw = Math.min(78, (w - labelW - panelGap * (panelsAcross - 1) - allGap * panelsAcross) / (panelsAcross * cols.length));
      const ch = narrow ? 30 : 32;
      const headH = 44;
      const panelW = cw * cols.length + allGap;
      const panelH = headH + ch * cats.length;
      const conds = [
        { key: "baseline", title: "Before" },
        { key: "ablation", title: "After ablation" },
      ];
      const h = narrow ? panelH * 2 + 28 : panelH;
      const svg = U.svg(mount, w, h, "Heatmaps of the harmful-answer rate per category and severity, before and after ablation.");

      conds.forEach((cond, p) => {
        const ox = narrow ? labelW : labelW + p * (panelW + panelGap);
        const oy = narrow ? p * (panelH + 28) : 0;
        const g = svg.append("g").attr("transform", `translate(${ox},${oy})`);
        g.append("text").attr("class", "t-strong").attr("y", 13).text(cond.title);
        g.append("g")
          .selectAll("text")
          .data(cols)
          .join("text")
          .attr("class", "t-muted t-small")
          .attr("x", (c, i) => i * cw + (c.key === "all" ? allGap : 0) + cw / 2)
          .attr("y", headH - 9)
          .attr("text-anchor", "middle")
          .text((c) => c.label);

        if (p === 0 || narrow) {
          svg
            .append("g")
            .attr("transform", `translate(${ox - 10},${oy + headH})`)
            .selectAll("text")
            .data(cats)
            .join("text")
            .attr("y", (c, i) => i * ch + ch / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .style("font-size", narrow ? "11.5px" : "12.5px")
            .style("fill", "var(--ink)")
            .text((c) => (narrow ? shortLabel[c.key] : c.label));
        }

        const cells = [];
        cats.forEach((cat, r) =>
          cols.forEach((col, i) => {
            const d = cell(cond.key, cat.key, col.key);
            cells.push({ ...d, label: cat.label, colLabel: col.label, x: i * cw + (col.key === "all" ? allGap : 0), y: headH + r * ch });
          })
        );
        const cg = g.selectAll("g.cell").data(cells).join("g").attr("class", "cell").attr("transform", (d) => `translate(${d.x},${d.y})`);
        cg.append("rect")
          .attr("x", 1)
          .attr("y", 1)
          .attr("width", cw - 2)
          .attr("height", ch - 2)
          .attr("rx", 3)
          .style("fill", (d) => (d.n === 0 ? U.css("--surface-2") : color(d.rate)))
          .style("opacity", (d) => (d.n > 0 && d.n < SMALL_N ? 0.42 : 1));
        cg.append("text")
          .attr("x", cw / 2)
          .attr("y", ch / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", "middle")
          .attr("class", "t-num")
          .style("font-size", "11.5px")
          .style("font-weight", (d) => (d.severity === "all" ? 650 : 500))
          .style("fill", (d) => (d.n === 0 || d.n < SMALL_N ? U.css("--ink-2") : inkOn(color(d.rate))))
          .text((d) => (d.n === 0 ? "–" : U.pct(d.rate)));
        cg.filter((d) => d.n > 0 && d.n < SMALL_N)
          .select("text")
          .append("tspan")
          .attr("class", "t-muted")
          .attr("dx", 3)
          .style("font-size", "9.5px")
          .style("font-weight", 400)
          .text((d) => `n=${d.n}`);
        V.tooltip.bind(
          cg,
          (d) => ({
            title: `${d.label} · ${d.colLabel}`,
            rows:
              d.n === 0
                ? [{ value: "no requests", label: "" }]
                : [
                    { value: U.pct(d.rate), label: `${cond.title.toLowerCase()} judged harmful`, color: color(d.rate) },
                    { value: `${d.k} of ${d.n}`, label: "requests" },
                  ],
            note: d.n > 0 ? `95% interval ${U.pct(d.lo)}–${U.pct(d.hi)}` : null,
          }),
          { focusable: false }
        );
      });
    }

    render();
    return {
      render,
      table: () => ({
        caption: "Share of requests judged harmful (count / requests in the cell).",
        columns: ["Category", ...["baseline", "ablation"].flatMap((c) => cols.map((col) => `${c === "baseline" ? "Before" : "After"} · ${col.label}`))],
        rows: cats.map((cat) => [
          cat.label,
          ...["baseline", "ablation"].flatMap((cond) =>
            cols.map((col) => {
              const d = cell(cond, cat.key, col.key);
              return d.n ? `${U.pct(d.rate)} (${d.k}/${d.n})` : "–";
            })
          ),
        ]),
      }),
    };
  };
})(window.Viz);
