/* Harmful rate per attack framing, with Wilson 95% intervals, before and after ablation. */
(function (V) {
  const U = V.util;

  V.charts.framing = function (fig, data) {
    const mount = fig.querySelector(".chart");
    const legendEl = fig.querySelector(".legend");
    const rows = data.framing.rows;
    const hints = Object.fromEntries(data.meta.styles.map((s) => [s.key, s.hint]));
    const SERIES = [
      { key: "baseline", label: "Before", color: "--cond-base", dy: -6 },
      { key: "ablation", label: "After ablation", color: "--cond-abl", dy: 6 },
    ];
    const STORY = new Set(["fictional_frame", "direct"]);

    function render() {
      const w = U.width(mount);
      const narrow = w < 620;
      const labelW = narrow ? 0 : 200;
      const rowH = narrow ? 64 : 50;
      const top = 26;
      const h = top + rows.length * rowH + 4;
      const svg = U.svg(mount, w, h, "Dot plot of harmful-answer rate by framing with 95% intervals.");
      const x = d3.scaleLinear([0, 1], [labelW + 6, w - 44]);

      const grid = svg.append("g").attr("class", "grid");
      grid
        .selectAll("line")
        .data([0, 0.25, 0.5, 0.75, 1])
        .join("line")
        .attr("x1", x).attr("x2", x)
        .attr("y1", top - 4).attr("y2", h);
      svg
        .append("g")
        .attr("class", "axis")
        .selectAll("text")
        .data([0, 0.25, 0.5, 0.75, 1])
        .join("text")
        .attr("x", x)
        .attr("y", 12)
        .attr("text-anchor", "middle")
        .text((t) => U.pct(t));

      const g = svg
        .append("g")
        .selectAll("g")
        .data(rows)
        .join("g")
        .attr("transform", (d, i) => `translate(0,${top + i * rowH})`);

      const markY = narrow ? 40 : rowH / 2;
      const label = g
        .append("text")
        .attr("x", narrow ? 0 : 0)
        .attr("y", narrow ? 14 : rowH / 2 - 6);
      label.append("tspan").attr("class", "t-strong").text((d) => d.label);
      if (narrow) label.append("tspan").attr("class", "t-muted t-small").attr("dx", 6).text((d) => `${hints[d.key]} · n=${d.baseline.n}`);
      if (!narrow) {
        g.append("text")
          .attr("class", "t-muted t-small")
          .attr("y", rowH / 2 + 10)
          .text((d) => `${hints[d.key]} · n=${d.baseline.n}`);
      }

      for (const s of SERIES) {
        const sg = g.append("g").attr("transform", `translate(0,${markY + s.dy})`);
        sg.append("line")
          .attr("x1", (d) => x(d[s.key].lo))
          .attr("x2", (d) => x(d[s.key].hi))
          .style("stroke", U.css(s.color))
          .style("stroke-width", 2)
          .style("stroke-linecap", "round");
        sg.append("circle")
          .attr("cx", (d) => x(d[s.key].rate))
          .attr("r", 5)
          .style("fill", U.css(s.color))
          .style("stroke", U.css("--surface"))
          .style("stroke-width", 2);
        sg.filter((d) => STORY.has(d.key))
          .append("text")
          .attr("class", "t-small t-num halo")
          .attr("x", (d) => x(d[s.key].hi) + 6)
          .attr("dy", "0.35em")
          .text((d) => `${U.pctAuto(d[s.key].rate)} (${d[s.key].k} of ${d[s.key].n})`);
      }

      const hit = g
        .append("rect")
        .attr("class", "hit")
        .attr("x", 0)
        .attr("width", w)
        .attr("height", rowH);
      V.tooltip.bind(hit, (d) => ({
        title: `${d.label} (${hints[d.key]})`,
        rows: SERIES.map((s) => ({
          value: `${U.pctAuto(d[s.key].rate)}`,
          label: `${s.label.toLowerCase()} · ${d[s.key].k}/${d[s.key].n}, 95% CI ${U.pct(d[s.key].lo)}–${U.pct(d[s.key].hi)}`,
          color: U.css(s.color),
        })),
      }));

      V.legend.render(legendEl, [
        ...SERIES.map((s) => ({ label: s.label, color: `var(${s.color})` })),
        { label: "95% interval", color: "var(--ink-2)", shape: "line" },
      ]);
    }

    render();
    return {
      render,
      table: () => ({
        caption: "Share judged harmful by framing, with Wilson 95% intervals.",
        columns: ["Framing", "Requests", "Before", "95% CI", "After ablation", "95% CI"],
        rows: rows.map((d) => [
          d.label,
          String(d.baseline.n),
          `${U.pct(d.baseline.rate, 1)} (${d.baseline.k})`,
          `${U.pct(d.baseline.lo, 1)}–${U.pct(d.baseline.hi, 1)}`,
          `${U.pct(d.ablation.rate, 1)} (${d.ablation.k})`,
          `${U.pct(d.ablation.lo, 1)}–${U.pct(d.ablation.hi, 1)}`,
        ]),
      }),
    };
  };
})(window.Viz);
