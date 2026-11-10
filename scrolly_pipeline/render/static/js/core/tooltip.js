/* One shared tooltip. Content is built with textContent only (labels are data). */
(function (V) {
  const tip = document.getElementById("tooltip");

  function build(content) {
    tip.replaceChildren();
    if (content.title) {
      const h = document.createElement("div");
      h.className = "tt-title";
      h.textContent = content.title;
      tip.append(h);
    }
    for (const r of content.rows || []) {
      const row = document.createElement("div");
      row.className = "tt-row";
      if (r.color) {
        const k = document.createElement("span");
        k.className = r.dot ? "tt-key tt-key--dot" : "tt-key";
        k.style.background = r.color;
        row.append(k);
      }
      const v = document.createElement("strong");
      v.textContent = r.value;
      row.append(v);
      if (r.label) {
        const l = document.createElement("span");
        l.className = "tt-label";
        l.textContent = r.label;
        row.append(l);
      }
      tip.append(row);
    }
    if (content.note) {
      const n = document.createElement("div");
      n.className = "tt-note";
      n.textContent = content.note;
      tip.append(n);
    }
  }

  function place(x, y) {
    const pad = 14;
    const { width, height } = tip.getBoundingClientRect();
    let left = x + pad;
    let top = y + pad;
    if (left + width > window.innerWidth - 8) left = x - width - pad;
    if (top + height > window.innerHeight - 8) top = y - height - pad;
    tip.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
  }

  V.tooltip = {
    show(event, content) {
      build(content);
      tip.hidden = false;
      V.tooltip.move(event);
    },
    move(event) {
      if (tip.hidden) return;
      if (event && "clientX" in event && event.type !== "focus") {
        place(event.clientX, event.clientY);
      } else if (event && event.target && event.target.getBoundingClientRect) {
        const b = event.target.getBoundingClientRect();
        place(b.right, b.top);
      }
    },
    hide() {
      tip.hidden = true;
    },
    /** Hover + keyboard focus on a d3 selection; `content(d)` returns the tooltip spec. */
    bind(selection, content, { focusable = true } = {}) {
      selection
        .attr("data-mark", "")
        .on("pointerenter", (e, d) => V.tooltip.show(e, content(d)))
        // scrolling hides the tooltip while the pointer stays on the mark: bring it back on the next move
        .on("pointermove", (e, d) => (tip.hidden ? V.tooltip.show(e, content(d)) : V.tooltip.move(e)))
        .on("pointerleave", () => V.tooltip.hide());
      if (focusable) {
        selection
          .attr("tabindex", 0)
          .on("focus", (e, d) => V.tooltip.show(e, content(d)))
          .on("blur", () => V.tooltip.hide());
      }
      return selection;
    },
  };

  window.addEventListener("scroll", () => V.tooltip.hide(), { passive: true });
})(window.Viz);
