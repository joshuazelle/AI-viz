/* HTML legends above charts. Swatches mirror the mark; text stays in ink tokens. */
(function (V) {
  function item(spec) {
    const el = document.createElement("span");
    el.className = "legend__item";
    const sw = document.createElement("span");
    sw.className = `legend__swatch${spec.shape ? ` legend__swatch--${spec.shape}` : ""}`;
    if (spec.shape === "ring") sw.style.borderColor = spec.color;
    else sw.style.background = spec.color;
    el.append(sw);
    const label = document.createElement("span");
    label.textContent = spec.label;
    el.append(label);
    if (spec.value != null) {
      const b = document.createElement("b");
      b.textContent = spec.value;
      el.append(b);
    }
    return el;
  }

  V.legend = {
    /** Fill `container` with legend items: [{label, color, shape?, value?}]. */
    render(container, items, title) {
      container.replaceChildren();
      if (title) {
        const t = document.createElement("span");
        t.className = "legend__title";
        t.textContent = title;
        container.append(t);
      }
      items.forEach((spec) => container.append(item(spec)));
    },
    outcomes(container, counts, title) {
      V.legend.render(
        container,
        V.util.OUTCOMES.map((k) => ({
          label: V.util.OUTCOME_LABELS[k],
          color: V.util.outcomeColor(k),
          value: counts ? V.util.int(counts[k]) : null,
        })),
        title
      );
    },
  };
})(window.Viz);
