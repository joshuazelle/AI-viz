/* Boot: mount every [data-chart] figure, wire scroll steps, table views and re-rendering. */
(function (V) {
  const data = JSON.parse(document.getElementById("viz-data").textContent);
  V.data = data;
  V.theme.init();

  const instances = [];
  document.querySelectorAll("[data-chart]").forEach((fig) => {
    const make = V.charts[fig.dataset.chart];
    if (!make) {
      console.error(`No chart module named "${fig.dataset.chart}"`);
      return;
    }
    try {
      const chart = make(fig, data);
      instances.push(chart);
      if (chart.table) V.table.attach(fig, chart.table);
      const section = fig.closest(".scrolly");
      if (section && chart.step) V.scroller(section, (i) => chart.step(i));
    } catch (err) {
      console.error(`Chart "${fig.dataset.chart}" failed`, err);
    }
  });

  const rerender = () => instances.forEach((c) => c.render());
  let lastWidth = window.innerWidth;
  window.addEventListener(
    "resize",
    V.util.debounce(() => {
      // ignore height-only resizes (mobile URL bar), they would restart animations
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      rerender();
    }, 150)
  );
  document.addEventListener("themechange", rerender);

  // reading progress in the top bar
  const bar = document.querySelector(".topbar__progress");
  if (bar) {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
  document.documentElement.classList.add("is-ready");
})(window.Viz);
