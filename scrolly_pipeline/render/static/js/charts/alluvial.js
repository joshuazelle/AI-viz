/* Two-column alluvial diagram: baseline outcome -> ablated outcome for every prompt. */
(function (V) {
  const U = V.util;

  V.charts.alluvial = function (fig, data) {
    const mount = fig.querySelector(".chart");
    const legendEl = fig.querySelector(".legend");
    const M = data.flows.matrix;
    const O = U.OUTCOMES;
    const n = data.counts.n;
    const left = O.map((k, i) => ({ key: k, side: "baseline", value: d3.sum(M[i]) }));
    const right = O.map((k, j) => ({ key: k, side: "ablation", value: d3.sum(M, (row) => row[j]) }));
    const flows = [];
    O.forEach((s, i) => O.forEach((t, j) => M[i][j] > 0 && flows.push({ i, j, source: s, target: t, value: M[i][j] })));

    function render() {
      const w = U.width(mount);
      const narrow = w < 560;
      const h = narrow ? 380 : 440;
      const svg = U.svg(mount, w, h, "Alluvial diagram from baseline outcome to ablated outcome.");
      const mt = 34;
      const mb = 8;
      const labelW = narrow ? 92 : 132;
      const nodeW = 12;
      const gap = 10;
      const x0 = labelW;
      const x1 = w - labelW - nodeW;
      const k = (h - mt - mb - gap * (O.length - 1)) / n;

      const stack = (nodes) => {
        let y = mt;
        nodes.forEach((d) => {
          d.y = y;
          d.h = Math.max(1, d.value * k);
          y += d.h + gap;
        });
      };
      stack(left);
      stack(right);

      // ribbon offsets: inside a source node ordered by target, inside a target node by source
      const outOff = O.map(() => 0);
      const inOff = O.map(() => 0);
      flows
        .sort((a, b) => a.i - b.i || a.j - b.j)
        .forEach((f) => {
          f.t = f.value * k;
          f.sy = left[f.i].y + outOff[f.i];
          outOff[f.i] += f.t;
        });
      [...flows]
        .sort((a, b) => a.j - b.j || a.i - b.i)
        .forEach((f) => {
          f.ty = right[f.j].y + inOff[f.j];
          inOff[f.j] += f.t;
        });

      const xa = x0 + nodeW;
      const xm = (xa + x1) / 2;
      const ribbon = (f) =>
        `M${xa},${f.sy}C${xm},${f.sy} ${xm},${f.ty} ${x1},${f.ty}` +
        `L${x1},${f.ty + f.t}C${xm},${f.ty + f.t} ${xm},${f.sy + f.t} ${xa},${f.sy + f.t}Z`;

      svg
        .append("g")
        .selectAll("text")
        .data([
          { x: x0 + nodeW / 2, t: "Before", a: "middle" },
          { x: x1 + nodeW / 2, t: "After ablation", a: "middle" },
        ])
        .join("text")
        .attr("class", "t-strong")
        .attr("x", (d) => d.x)
        .attr("y", 14)
        .attr("text-anchor", (d) => d.a)
        .text((d) => d.t);

      const paths = svg
        .append("g")
        .selectAll("path")
        .data(flows)
        .join("path")
        .attr("d", ribbon)
        .style("fill", (f) => U.css(`--o-${f.target}`))
        .style("fill-opacity", 0.32)
        .style("mix-blend-mode", "normal");
      V.tooltip.bind(paths, (f) => ({
        title: `${U.OUTCOME_LABELS[f.source]} → ${U.OUTCOME_LABELS[f.target]}`,
        rows: [
          { value: U.int(f.value), label: "requests", color: U.outcomeColor(f.target) },
          { value: U.pct(f.value / left[f.i].value), label: `of baseline ${U.OUTCOME_LABELS[f.source].toLowerCase()}s` },
        ],
      }));
      paths
        .on("pointerenter.hl", (e, f) => paths.style("fill-opacity", (g) => (g === f ? 0.62 : 0.14)))
        .on("pointerleave.hl", () => paths.style("fill-opacity", 0.32));

      const nodes = svg.append("g");
      for (const [col, x] of [[left, x0], [right, x1]]) {
        nodes
          .append("g")
          .selectAll("rect")
          .data(col)
          .join("rect")
          .attr("x", x)
          .attr("y", (d) => d.y)
          .attr("width", nodeW)
          .attr("height", (d) => d.h)
          .attr("rx", 2)
          .style("fill", (d) => U.css(`--o-${d.key}`));
      }

      const labelOf = (col, side) =>
        U.spread(col.map((d) => ({ d, y: d.y + d.h / 2 })), narrow ? 15 : 17, mt + 6, h - mb - 4).map((l) => ({ ...l, side }));
      const labels = [...labelOf(left, "l"), ...labelOf(right, "r")];
      const lab = svg
        .append("g")
        .selectAll("text")
        .data(labels)
        .join("text")
        .attr("x", (l) => (l.side === "l" ? x0 - 8 : x1 + nodeW + 8))
        .attr("y", (l) => l.y)
        .attr("dy", "0.35em")
        .attr("text-anchor", (l) => (l.side === "l" ? "end" : "start"))
        .style("font-size", narrow ? "11px" : "12.5px");
      lab.append("tspan").attr("class", "t-strong").text((l) => U.OUTCOME_LABELS[l.d.key]);
      lab.append("tspan").attr("class", "t-muted t-num").attr("dx", 5).text((l) => U.int(l.d.value));

      // direct labels on the big ribbons only, at the source end where bands don't cross yet
      const big = flows.filter((f) => f.value >= 60 && f.t >= 16);
      svg
        .append("g")
        .selectAll("text")
        .data(big)
        .join("text")
        .attr("class", "t-strong t-num halo")
        .attr("x", xa + 10)
        .attr("y", (f) => f.sy + f.t / 2)
        .attr("dy", "0.35em")
        .style("pointer-events", "none")
        .text((f) => (narrow ? U.int(f.value) : `${U.int(f.value)} → ${U.OUTCOME_LABELS[f.target].toLowerCase()}`));

      V.legend.outcomes(legendEl, null, "Ribbon colour = outcome after ablation");
    }

    render();
    return {
      render,
      table: () => ({
        caption: "Rows: outcome before. Columns: outcome after ablation. Cells: number of requests.",
        columns: ["Before \\ After", ...O.map((k) => U.OUTCOME_LABELS[k]), "Total"],
        rows: O.map((k, i) => [U.OUTCOME_LABELS[k], ...M[i].map(String), String(d3.sum(M[i]))]),
      }),
    };
  };
})(window.Viz);
