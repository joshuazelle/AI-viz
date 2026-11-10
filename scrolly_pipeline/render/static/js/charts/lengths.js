/* Response length histograms as small multiples on a shared x and y scale. */
(function (V) {
  const U = V.util;

  V.charts.lengths = function (fig, data) {
    const mount = fig.querySelector(".chart");
    const legendEl = fig.querySelector(".legend");
    const L = data.lengths;
    const ROWS = [
      { key: "baseline", title: "Before", color: "--cond-base" },
      { key: "ablation", title: "After ablation", color: "--cond-abl" },
    ];

    function render() {
      const w = U.width(mount);
      const narrow = w < 560;
      const rowH = narrow ? 110 : 130;
      const gapY = 26;
      const top = 8;
      const axisH = 34;
      const h = top + ROWS.length * rowH + gapY * (ROWS.length - 1) + axisH;
      const svg = U.svg(mount, w, h, "Histograms of response length in words, before and after ablation.");
      const ml = 34;
      const mr = 12;
      const x = d3.scaleLinear([0, L.edges[L.edges.length - 1]], [ml, w - mr]);
      const ymax = d3.max(ROWS, (r) => d3.max(L[r.key].counts));
      const bw = Math.max(1, Math.min(24, x(L.bin) - x(0) - 2));

      ROWS.forEach((row, r) => {
        const oy = top + r * (rowH + gapY);
        const y = d3.scaleLinear([0, ymax], [oy + rowH, oy + 18]).nice();
        const g = svg.append("g");
        g.append("g").attr("class", "grid").selectAll("line").data(y.ticks(3)).join("line")
          .attr("x1", ml).attr("x2", w - mr).attr("y1", y).attr("y2", y);
        g.append("g").attr("class", "axis").selectAll("text").data(y.ticks(3)).join("text")
          .attr("x", ml - 6).attr("y", y).attr("dy", "0.35em").attr("text-anchor", "end").text((t) => t);
        g.append("text").attr("class", "t-strong").attr("x", ml).attr("y", oy + 6).text(row.title);

        const s = L[row.key];
        const solid = U.css(row.color);
        const tint = d3.interpolateRgb(U.css("--surface"), solid)(0.38);
        const bins = s.counts.map((c, i) => ({ c, cut: s.cut_counts[i], lo: L.edges[i], hi: L.edges[i + 1] }));
        const bx = (b) => x(b.lo) + (x(L.bin) - x(0) - bw) / 2;
        // whole bar in the light tint (= cut off), complete answers drawn solid from the baseline
        g.append("g").selectAll("path").data(bins).join("path")
          .attr("d", (b) => U.vbar(bx(b), y(0), bw, y(0) - y(b.c)))
          .style("fill", tint);
        g.append("g").selectAll("rect").data(bins.filter((b) => b.c - b.cut > 0)).join("rect")
          .attr("x", bx)
          .attr("width", bw)
          .attr("y", (b) => y(b.c - b.cut))
          .attr("height", (b) => y(0) - y(b.c - b.cut))
          .style("fill", solid);
        g.append("g").selectAll("line").data(bins.filter((b) => b.cut > 0 && b.c - b.cut > 0)).join("line")
          .attr("x1", bx).attr("x2", (b) => bx(b) + bw)
          .attr("y1", (b) => y(b.c - b.cut)).attr("y2", (b) => y(b.c - b.cut))
          .style("stroke", U.css("--surface")).style("stroke-width", 2);
        V.tooltip.bind(
          g.append("g").selectAll("rect").data(bins).join("rect").attr("class", "hit")
            .attr("x", (b) => x(b.lo)).attr("width", x(L.bin) - x(0)).attr("y", oy + 10).attr("height", rowH - 10),
          (b) => ({
            title: `${b.lo}–${b.hi} words`,
            rows: [
              { value: U.int(b.c), label: `answers ${row.title.toLowerCase()}`, color: solid },
              { value: U.int(b.cut), label: "of them stop mid-sentence", color: tint },
            ],
          }),
          { focusable: false }
        );

        const mx = x(s.median);
        g.append("line").attr("x1", mx).attr("x2", mx).attr("y1", y(0)).attr("y2", oy + 12)
          .style("stroke", U.css("--ink")).style("stroke-width", 1.5);
        const right = s.median > L.edges[L.edges.length - 1] / 2;
        g.append("text").attr("class", "t-small t-num halo").attr("x", right ? mx - 6 : mx + 6).attr("y", oy + 22)
          .attr("text-anchor", right ? "end" : "start")
          .style("fill", U.css("--ink"))
          .text(`median ${Math.round(s.median)} words`);
        g.append("text").attr("class", "t-small t-muted").attr("x", w - mr).attr("y", oy + 6).attr("text-anchor", "end")
          .text(`${U.pct(s.cut_off.rate)} stop mid-sentence`);
      });

      const ay = top + ROWS.length * rowH + gapY * (ROWS.length - 1);
      const ticks = x.ticks(narrow ? 4 : 9);
      svg.append("g").attr("class", "axis").selectAll("text").data(ticks).join("text")
        .attr("x", x).attr("y", ay + 16).attr("text-anchor", "middle").text((t) => t);
      svg.append("text").attr("class", "t-muted t-small").attr("x", w - mr).attr("y", ay + 32).attr("text-anchor", "end").text("words per response →");
      svg.append("line").attr("x1", ml).attr("x2", w - mr).attr("y1", ay).attr("y2", ay).style("stroke", U.css("--axis"));

      V.legend.render(legendEl, [
        ...ROWS.map((r) => ({ label: r.title, color: `var(${r.color})`, shape: "square" })),
        { label: "lighter top: stops mid-sentence (hit the length limit)", color: "color-mix(in srgb, var(--cond-abl) 38%, var(--surface))", shape: "square" },
        { label: "median", color: "var(--ink)", shape: "line" },
      ]);
    }

    render();
    return {
      render,
      table: () => ({
        caption: `Responses per ${L.bin}-word bin.`,
        columns: ["Words", "Before", "of which cut off", "After ablation", "of which cut off"],
        rows: L.baseline.counts.map((c, i) => [
          `${L.edges[i]}–${L.edges[i + 1]}`,
          String(c),
          String(L.baseline.cut_counts[i]),
          String(L.ablation.counts[i]),
          String(L.ablation.cut_counts[i]),
        ]),
      }),
    };
  };
})(window.Viz);
