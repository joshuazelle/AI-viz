/* Icicle of the first three (masked) words of every response, before vs after ablation.
   Words outside a function-word whitelist arrive already replaced by "*" from the pipeline. */
(function (V) {
  const U = V.util;
  const DISPLAY = { "*": "‹word›", "**": "** (bold)", "#": "# (heading)", "1.": "1. (list)", "(other)": "other" };
  // "i" -> "I", "i'm" -> "I'm"; the first word of an answer is capitalised
  const word = (tok, first) => {
    const t = tok.replace(/^i(?=$|')/, "I").replace(/'/g, "’");
    return first ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  };
  const show = (tok, depth) => DISPLAY[tok] || word(tok, depth === 0);
  const phrase = (path) => path.map((t, i) => (t === "*" ? "‹word›" : word(t, i === 0))).join(" ");

  V.charts.openings = function (fig, data) {
    const mount = fig.querySelector(".chart");
    const legendEl = fig.querySelector(".legend");
    const PANELS = [
      { key: "baseline", title: "Before" },
      { key: "ablation", title: "After ablation" },
    ];

    function flatten(tree) {
      const total = tree.n;
      const out = [];
      (function walk(node, depth, y0, path) {
        let y = y0;
        for (const c of node.children) {
          const share = c.n / total;
          const p = [...path, c.label];
          out.push({ ...c, depth, y, share, path: p });
          walk(c, depth + 1, y, p);
          y += share;
        }
      })(tree, 0, 0, []);
      return out;
    }

    const majority = (node) => {
      let best = 0;
      node.outcomes.forEach((v, i) => v > node.outcomes[best] && (best = i));
      return U.OUTCOMES[best];
    };

    function render() {
      const w = U.width(mount);
      const narrow = w < 700;
      const gap = 28;
      const panelW = narrow ? w : (w - gap) / 2;
      const panelH = narrow ? 300 : 400;
      const head = 40;
      const h = narrow ? 2 * (panelH + head) + gap : panelH + head;
      const svg = U.svg(mount, w, h, "Icicle charts of the first three words of each response, before and after ablation.");
      const colW = panelW / 3;

      PANELS.forEach((panel, p) => {
        const ox = narrow ? 0 : p * (panelW + gap);
        const oy = narrow ? p * (panelH + head + gap) : 0;
        const g = svg.append("g").attr("transform", `translate(${ox},${oy})`);
        g.append("text").attr("class", "t-strong").attr("y", 13).text(panel.title);
        g.append("g").selectAll("text").data(["1st word", "2nd", "3rd"]).join("text")
          .attr("class", "t-muted t-small").attr("x", (d, i) => i * colW + 4).attr("y", head - 10).text((d) => d);

        const nodes = flatten(data.openings[panel.key]);
        const y = d3.scaleLinear([0, 1], [head, head + panelH]);
        const cell = g.selectAll("g.node").data(nodes).join("g").attr("class", "node")
          .attr("transform", (d) => `translate(${d.depth * colW},${y(d.y)})`);
        cell.append("rect")
          .attr("x", 1).attr("y", 1)
          .attr("width", colW - 2)
          .attr("height", (d) => Math.max(0.5, y(d.share) - y(0) - 2))
          .attr("rx", 3)
          .style("fill", (d) => (d.label === "(other)" ? U.css("--surface-2") : U.css(`--o-${majority(d)}`)))
          .style("fill-opacity", (d) => (d.label === "(other)" ? 1 : 0.24));
        const fits = (d) => y(d.share) - y(0) >= 17;
        const t = cell.filter(fits).append("text")
          .attr("x", 8).attr("y", (d) => Math.min(16, (y(d.share) - y(0)) / 2 + 4))
          .style("font-size", narrow ? "11px" : "12px");
        t.append("tspan")
          .style("fill", (d) => (d.label === "*" || d.label === "(other)" ? U.css("--muted") : U.css("--ink")))
          .style("font-weight", (d) => (d.label === "*" || d.label === "(other)" ? 400 : 600))
          .style("font-style", (d) => (d.label === "*" ? "italic" : "normal"))
          .text((d) => show(d.label, d.depth));
        t.filter((d) => colW > 110).append("tspan").attr("class", "t-muted t-num").attr("dx", 6).text((d) => U.pct(d.share));

        V.tooltip.bind(
          cell,
          (d) => ({
            title: d.label === "(other)" ? "Other openings" : `“${phrase(d.path.filter((x) => x !== "(other)"))} …”`,
            rows: [
              { value: U.int(d.n), label: `responses (${U.pct(d.share, 1)})` },
              ...U.OUTCOMES.map((k, i) => ({ value: U.int(d.outcomes[i]), label: U.OUTCOME_LABELS[k].toLowerCase(), color: U.outcomeColor(k), dot: true })).filter((r) => r.value !== "0"),
            ],
          }),
          { focusable: false }
        );
      });

      V.legend.render(legendEl, [
        ...U.OUTCOMES.map((k) => ({ label: U.OUTCOME_LABELS[k], color: U.outcomeColor(k), shape: "square" })),
        { label: "other: rarer openings, folded together", color: "var(--surface-2)", shape: "square" },
      ], "Box tint = most common outcome among those answers");
    }

    render();
    return {
      render,
      table: () => ({
        caption: "Most common openings (first three tokens, content words masked).",
        columns: ["Opening", "Before", "After ablation"],
        rows: (() => {
          const leaves = {};
          for (const panel of PANELS) {
            for (const d of flatten(data.openings[panel.key])) {
              if (d.depth !== 2 || d.label === "(other)") continue;
              const k = phrase(d.path);
              leaves[k] = leaves[k] || { baseline: 0, ablation: 0 };
              leaves[k][panel.key] = d.n;
            }
          }
          return Object.entries(leaves)
            .sort((a, b) => b[1].baseline + b[1].ablation - (a[1].baseline + a[1].ablation))
            .map(([k, v]) => [`“${k} …”`, String(v.baseline), String(v.ablation)]);
        })(),
      }),
    };
  };
})(window.Viz);
