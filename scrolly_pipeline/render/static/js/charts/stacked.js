/* Tall segmented bars: one whole split into the four outcomes, per row.
   Used for the hero overview (all 1,000 requests) and the safe-completion chapter. */
(function (V) {
  const U = V.util;
  const COND = { baseline: "Before", ablation: "After ablation" };

  /** cfg.groups: [{label|null, rows: [{label, counts, n}]}] */
  function segmented(fig, cfg) {
    const mount = fig.querySelector(".chart");
    const legendEl = fig.querySelector(".legend");

    function render() {
      const w = U.width(mount);
      const narrow = w < 560;
      const labelW = narrow ? 92 : 120;
      const barH = cfg.barH || 28;
      const rowGap = 8;
      const groupGap = 18;
      const headH = (g) => (g.label ? 24 : 0);
      const groupH = (g) => headH(g) + g.rows.length * barH + (g.rows.length - 1) * rowGap;
      const h = d3.sum(cfg.groups, groupH) + (cfg.groups.length - 1) * groupGap + 2;
      const svg = U.svg(mount, w, h, cfg.aria);
      const x = d3.scaleLinear([0, 1], [labelW, w - 2]);

      let oy = 0;
      cfg.groups.forEach((group) => {
        const g = svg.append("g").attr("transform", `translate(0,${oy})`);
        oy += groupH(group) + groupGap;
        if (group.label) g.append("text").attr("class", "t-strong").attr("y", 14).style("font-size", "13px").text(group.label);
        group.rows.forEach((row, ri) => {
          const by = headH(group) + ri * (barH + rowGap);
          g.append("text").attr("x", labelW - 10).attr("y", by + barH / 2).attr("dy", "0.35em").attr("text-anchor", "end")
            .attr("class", group.label ? "t-muted" : "t-strong").text(row.label);
          let acc = 0;
          const segs = U.OUTCOMES.map((k) => {
            const share = row.counts[k] / row.n;
            const s = { key: k, share, k: row.counts[k], n: row.n, x0: acc };
            acc += share;
            return s;
          }).filter((s) => s.k > 0);
          const sg = g.append("g").selectAll("g").data(segs).join("g");
          sg.append("rect")
            .attr("x", (s) => x(s.x0) + (s.x0 > 0 ? 1 : 0))
            .attr("y", by)
            .attr("width", (s) => Math.max(1, x(s.x0 + s.share) - x(s.x0) - (s.x0 > 0 ? 2 : 1)))
            .attr("height", barH)
            .attr("rx", 4)
            .style("fill", (s) => U.css(`--o-${s.key}`));
          sg.filter((s) => x(s.x0 + s.share) - x(s.x0) > 40)
            .append("text")
            .attr("x", (s) => x(s.x0) + 8)
            .attr("y", by + barH / 2)
            .attr("dy", "0.35em")
            .attr("class", "t-num")
            .style("font-weight", 600)
            .style("font-size", "12px")
            .style("fill", (s) => U.css(`--on-${s.key}`))
            .text((s) => U.pct(s.share));
          V.tooltip.bind(sg, (s) => ({
            title: group.label ? `${group.label} · ${row.label}` : row.label,
            rows: [{ value: `${U.pct(s.share, s.share < 0.1 ? 1 : 0)} (${U.int(s.k)} of ${U.int(s.n)})`, label: U.OUTCOME_LABELS[s.key], color: U.outcomeColor(s.key), dot: true }],
          }));
        });
      });
      V.legend.outcomes(legendEl, cfg.legendCounts || null, cfg.legendTitle);
    }

    render();
    return {
      render,
      table: () => ({
        caption: cfg.caption,
        columns: ["", ...U.OUTCOMES.map((k) => U.OUTCOME_LABELS[k])],
        rows: cfg.groups.flatMap((g) =>
          g.rows.map((r) => [g.label ? `${g.label} · ${r.label}` : r.label, ...U.OUTCOMES.map((k) => String(r.counts[k]))])
        ),
      }),
    };
  }

  V.charts.overview = function (fig, data) {
    const n = data.counts.n;
    return segmented(fig, {
      barH: 32,
      aria: "Two segmented bars: outcome mix of all requests before and after ablation.",
      caption: `Outcomes for all ${n} requests.`,
      groups: [
        {
          label: null,
          rows: [
            { label: "Before", counts: data.counts.baseline, n },
            { label: "After ablation", counts: data.counts.ablation, n },
          ],
        },
      ],
    });
  };

  V.charts.stacked = function (fig, data) {
    const groups = d3.groups(data.safe_complete.rows, (r) => r.category).map(([, rows]) => ({
      label: rows[0].label,
      rows: rows.map((r) => ({ label: COND[r.condition], counts: r.counts, n: r.n })),
    }));
    return segmented(fig, {
      aria: "Segmented bars of outcomes for self-harm and high-risk advice requests, before and after.",
      caption: "Outcome counts for requests that call for a safe, helpful answer.",
      groups,
    });
  };
})(window.Viz);
