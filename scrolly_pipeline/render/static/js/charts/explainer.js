/* Scroll-driven schematic of the refusal direction and directional ablation.
   Points are synthetic (seeded), drawn to explain the method - not real activations. */
(function (V) {
  const U = V.util;

  V.charts.explainer = function (fig) {
    const mount = fig.querySelector(".chart");
    const legendEl = fig.querySelector(".legend");
    const rand = U.rng(20241);
    const N = 60;
    const centre = { harmless: [-1.0, -0.62], harmful: [1.0, 0.62] };

    const pts = [];
    for (const kind of ["harmless", "harmful"]) {
      for (let i = 0; i < N; i++) {
        pts.push({
          kind,
          x: centre[kind][0] + U.gaussian(rand) * 0.6,
          y: centre[kind][1] + U.gaussian(rand) * 0.48,
        });
      }
    }
    const mean = (k) => {
      const s = pts.filter((p) => p.kind === k);
      return [d3.mean(s, (p) => p.x), d3.mean(s, (p) => p.y)];
    };
    const mHarm = mean("harmful");
    const mSafe = mean("harmless");
    const len = Math.hypot(mHarm[0] - mSafe[0], mHarm[1] - mSafe[1]);
    const r = [(mHarm[0] - mSafe[0]) / len, (mHarm[1] - mSafe[1]) / len];
    const origin = [(mHarm[0] + mSafe[0]) / 2, (mHarm[1] + mSafe[1]) / 2];
    // Directional ablation: x' = x - (r . x) r  (relative to the sketch's origin)
    for (const p of pts) {
      const dot = (p.x - origin[0]) * r[0] + (p.y - origin[1]) * r[1];
      p.px = p.x - dot * r[0];
      p.py = p.y - dot * r[1];
    }

    let step = 0;
    let svg = null;
    let sx;
    let sy;

    const LEGENDS = [
      [{ label: "one prompt’s activation", color: "var(--muted)" }],
      [
        { label: "harmful instruction", color: "var(--ink)" },
        { label: "harmless instruction", color: "var(--ink-2)", shape: "ring" },
      ],
      [
        { label: "harmful", color: "var(--ink)" },
        { label: "harmless", color: "var(--ink-2)", shape: "ring" },
        { label: "refusal direction r̂", color: "var(--accent)", shape: "line" },
      ],
      [
        { label: "harmful", color: "var(--ink)" },
        { label: "harmless", color: "var(--ink-2)", shape: "ring" },
        { label: "r̂ projected out", color: "var(--accent)", shape: "line" },
      ],
    ];

    function render() {
      const w = U.width(mount);
      const h = Math.min(U.availHeight(mount), Math.max(300, w * 0.9));
      svg = U.svg(mount, w, h, "Schematic: two clouds of activations, the direction between their means, and how ablation flattens them onto a line.");
      const size = Math.min(w, h) - 8;
      const span = 2.45;
      sx = d3.scaleLinear([origin[0] - span, origin[0] + span], [(w - size) / 2, (w + size) / 2]);
      sy = d3.scaleLinear([origin[1] - span, origin[1] + span], [(h + size) / 2, (h - size) / 2]);

      const defs = svg.append("defs");
      defs
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 8)
        .attr("refY", 5)
        .attr("markerWidth", 7)
        .attr("markerHeight", 7)
        .attr("orient", "auto-start-reverse")
        .append("path")
        .attr("d", "M0,0 L10,5 L0,10 Z")
        .style("fill", "var(--accent)");

      const ext = 2.35;
      const line = (dir, a, b) => ({
        x1: sx(origin[0] + dir[0] * a),
        y1: sy(origin[1] + dir[1] * a),
        x2: sx(origin[0] + dir[0] * b),
        y2: sy(origin[1] + dir[1] * b),
      });
      const axis = line(r, -ext, ext);
      const ortho = line([-r[1], r[0]], -ext, ext);

      svg
        .append("line")
        .attr("class", "ex-axis")
        .attr("x1", axis.x1).attr("y1", axis.y1).attr("x2", axis.x2).attr("y2", axis.y2)
        .style("stroke", "var(--grid)").style("stroke-width", 1);
      svg
        .append("line")
        .attr("class", "ex-plane")
        .attr("x1", ortho.x1).attr("y1", ortho.y1).attr("x2", ortho.x2).attr("y2", ortho.y2)
        .style("stroke", "var(--ink-2)").style("stroke-width", 1.5);
      svg
        .append("text")
        .attr("class", "ex-plane-label t-small halo")
        .attr("x", sx(origin[0] - r[1] * 2.0) + 10)
        .attr("y", sy(origin[1] + r[0] * 2.0))
        .text("everything left after ablation");

      svg
        .append("g")
        .attr("class", "ex-trails")
        .selectAll("line")
        .data(pts)
        .join("line")
        .attr("x1", (p) => sx(p.x)).attr("y1", (p) => sy(p.y))
        .attr("x2", (p) => sx(p.px)).attr("y2", (p) => sy(p.py))
        .style("stroke", "var(--axis)").style("stroke-width", 1);

      svg
        .append("g")
        .attr("class", "ex-points")
        .selectAll("circle")
        .data(pts)
        .join("circle")
        .attr("r", 4.5)
        .style("stroke-width", 2);

      const arrow = svg.append("g").attr("class", "ex-arrow");
      arrow
        .append("line")
        .attr("x1", sx(mSafe[0])).attr("y1", sy(mSafe[1]))
        .attr("x2", sx(mHarm[0])).attr("y2", sy(mHarm[1]))
        .attr("marker-end", "url(#arrowhead)")
        .style("stroke", "var(--accent)").style("stroke-width", 3).style("stroke-linecap", "round");
      const means = arrow.selectAll(".ex-mean").data([mSafe, mHarm]).join("g").attr("class", "ex-mean")
        .attr("transform", (m) => `translate(${sx(m[0])},${sy(m[1])})`);
      means.append("circle").attr("r", 7).style("fill", "var(--surface)").style("stroke", "var(--accent)").style("stroke-width", 2.5);
      means.append("circle").attr("r", 2.5).style("fill", "var(--accent)");
      arrow
        .append("text")
        .attr("class", "t-strong halo")
        .attr("x", sx(mHarm[0]) + 12)
        .attr("y", sy(mHarm[1]) - 12)
        .text("mean, harmful");
      arrow
        .append("text")
        .attr("class", "t-strong halo")
        .attr("x", sx(mSafe[0]) - 12)
        .attr("y", sy(mSafe[1]) + 22)
        .attr("text-anchor", "end")
        .text("mean, harmless");
      const mid = [(sx(mSafe[0]) + sx(mHarm[0])) / 2, (sy(mSafe[1]) + sy(mHarm[1])) / 2];
      arrow
        .append("text")
        .attr("class", "ex-r-label t-strong halo")
        .attr("x", mid[0] + 14)
        .attr("y", mid[1] + 18)
        .style("font-size", "14px")
        .text("r̂");

      update(false);
    }

    function update(animate) {
      if (!svg) return;
      const t = svg.transition().duration(animate ? U.dur(900) : 0).ease(d3.easeCubicInOut);
      const ablated = step >= 3;
      const labelled = step >= 1;

      svg.selectAll(".ex-points circle")
        .transition(t)
        .attr("cx", (p) => sx(ablated ? p.px : p.x))
        .attr("cy", (p) => sy(ablated ? p.py : p.y))
        .style("fill", (p) => (!labelled ? U.css("--muted") : p.kind === "harmful" ? U.css("--ink") : U.css("--surface")))
        .style("stroke", (p) => (!labelled ? U.css("--surface") : p.kind === "harmful" ? U.css("--surface") : U.css("--ink-2")));

      svg.select(".ex-axis").transition(t).style("opacity", step >= 2 ? 1 : 0);
      svg.select(".ex-arrow").transition(t).style("opacity", step === 2 ? 1 : step >= 3 ? 0.22 : 0);
      svg.select(".ex-plane").transition(t).style("opacity", step >= 3 ? 1 : 0);
      svg.select(".ex-plane-label").transition(t).style("opacity", step >= 3 ? 1 : 0);
      svg.selectAll(".ex-trails line").transition(t).style("opacity", step >= 3 ? 0.28 : 0);

      V.legend.render(legendEl, LEGENDS[Math.min(step, LEGENDS.length - 1)]);
    }

    render();
    return {
      render,
      step(i) {
        step = i;
        update(true);
      },
    };
  };
})(window.Viz);
