/* Generic dumbbell: two proportions per row joined by a connector.
   Used for "two judges" (keyword vs Qwen3Guard) and "voice markers" (before vs after). */
(function (V) {
  const U = V.util;

  function dumbbell(fig, cfg) {
    const mount = fig.querySelector(".chart");
    const legendEl = fig.querySelector(".legend");

    function render() {
      const w = U.width(mount);
      const narrow = w < 620;
      const labelW = narrow ? 0 : cfg.labelW || 200;
      const twoLine = !!cfg.hint;
      const rowH = narrow ? (twoLine ? 62 : 52) : twoLine ? 46 : 38;
      const top = 24;
      const rows = cfg.rows;
      const sepAfter = cfg.separateFirst ? 1 : 0;
      const sepH = sepAfter ? 14 : 0;
      const yOf = (i) => top + i * rowH + (i >= sepAfter && sepAfter ? sepH : 0);
      const h = yOf(rows.length - 1) + rowH + 2;
      const svg = U.svg(mount, w, h, cfg.aria);
      const x = d3.scaleLinear([0, 1], [labelW + 34, w - 40]);
      const ticks = [0, 0.25, 0.5, 0.75, 1];

      svg.append("g").attr("class", "grid").selectAll("line").data(ticks).join("line")
        .attr("x1", x).attr("x2", x).attr("y1", top - 4).attr("y2", h);
      svg.append("g").attr("class", "axis").selectAll("text").data(ticks).join("text")
        .attr("x", x).attr("y", 12).attr("text-anchor", "middle").text((t) => U.pct(t));
      if (sepAfter) {
        svg.append("line")
          .attr("x1", 0).attr("x2", w)
          .attr("y1", yOf(1) - sepH / 2 - 1).attr("y2", yOf(1) - sepH / 2 - 1)
          .style("stroke", U.css("--grid"));
      }

      const g = svg.append("g").selectAll("g").data(rows).join("g")
        .attr("transform", (d, i) => `translate(0,${yOf(i)})`);
      const my = narrow ? (twoLine ? 46 : 34) : rowH / 2;
      const labelY = narrow ? 13 : twoLine ? rowH / 2 - 7 : rowH / 2;

      g.append("text")
        .attr("y", labelY)
        .attr("dy", narrow ? 0 : "0.35em")
        .attr("class", (d, i) => (i === 0 && sepAfter ? "t-strong" : ""))
        .style("fill", "var(--ink)")
        .style("font-size", "12.5px")
        .text((d) => d.label);
      if (twoLine) {
        g.append("text")
          .attr("class", "t-muted t-small")
          .attr("y", labelY + (narrow ? 15 : 15))
          .attr("dy", narrow ? 0 : "0.35em")
          .text((d) => cfg.hint(d) || "");
      }

      const va = (d) => cfg.a.value(d).rate;
      const vb = (d) => cfg.b.value(d).rate;
      g.append("line")
        .attr("x1", (d) => x(Math.min(va(d), vb(d))))
        .attr("x2", (d) => x(Math.max(va(d), vb(d))))
        .attr("y1", my).attr("y2", my)
        .style("stroke", U.css("--axis"))
        .style("stroke-width", 2);

      for (const s of [cfg.a, cfg.b]) {
        g.append("circle")
          .attr("cx", (d) => x(s.value(d).rate))
          .attr("cy", my)
          .attr("r", 5.5)
          .style("fill", s.shape === "ring" ? U.css("--surface") : U.css(s.color))
          .style("stroke", s.shape === "ring" ? U.css(s.color) : U.css("--surface"))
          .style("stroke-width", s.shape === "ring" ? 2.5 : 2);
      }
      // values sit outside the pair: lower value on the left, higher on the right
      g.append("text")
        .attr("class", "t-small t-num")
        .attr("x", (d) => x(Math.min(va(d), vb(d))) - 10)
        .attr("y", my).attr("dy", "0.35em").attr("text-anchor", "end")
        .text((d) => U.pct(Math.min(va(d), vb(d))));
      g.append("text")
        .attr("class", "t-small t-num")
        .attr("x", (d) => x(Math.max(va(d), vb(d))) + 10)
        .attr("y", my).attr("dy", "0.35em")
        .text((d) => U.pct(Math.max(va(d), vb(d))));

      const hit = g.append("rect").attr("class", "hit").attr("width", w).attr("height", rowH);
      V.tooltip.bind(hit, (d) => ({
        title: d.label,
        rows: [cfg.a, cfg.b].map((s) => {
          const p = s.value(d);
          return { value: U.pct(p.rate), label: `${s.label} · ${p.k}/${p.n}`, color: U.css(s.color), dot: true };
        }),
        note: cfg.note ? cfg.note(d) : null,
      }));

      V.legend.render(legendEl, [cfg.a, cfg.b].map((s) => ({ label: s.label, color: `var(${s.color})`, shape: s.shape === "ring" ? "ring" : null })));
    }

    render();
    return {
      render,
      table: () => ({
        caption: cfg.caption,
        columns: ["", cfg.a.label, cfg.b.label],
        rows: cfg.rows.map((d) => [
          d.label,
          `${U.pct(cfg.a.value(d).rate, 1)} (${cfg.a.value(d).k}/${cfg.a.value(d).n})`,
          `${U.pct(cfg.b.value(d).rate, 1)} (${cfg.b.value(d).k}/${cfg.b.value(d).n})`,
        ]),
      }),
    };
  }

  V.charts.judges = function (fig, data) {
    const J = data.judges;
    return dumbbell(fig, {
      rows: [J.overall, ...J.rows],
      separateFirst: true,
      aria: "Dumbbell chart: per category, share of ablated answers judged jailbroken by the keyword judge and by Qwen3Guard.",
      a: { label: "Qwen3Guard: harmful", color: "--o-harmful", value: (d) => d.guard },
      b: { label: "Keyword judge: no refusal phrase", color: "--ink-2", shape: "ring", value: (d) => d.substring },
      note: (d) => `Gap: ${Math.round((d.substring.rate - d.guard.rate) * 100)} percentage points`,
      caption: "Ablated answers counted as a successful attack, by judge.",
    });
  };

  V.charts.markers = function (fig, data) {
    return dumbbell(fig, {
      rows: data.markers.rows,
      labelW: 230,
      aria: "Dumbbell chart: share of responses containing each stylistic marker, before and after ablation.",
      hint: (d) => d.hint,
      a: { label: "Before", color: "--cond-base", value: (d) => d.baseline },
      b: { label: "After ablation", color: "--cond-abl", value: (d) => d.ablation },
      caption: "Share of responses containing the marker at least once.",
    });
  };
})(window.Viz);
