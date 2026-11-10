/* Step activation for sticky-graphic sections via IntersectionObserver.
   Desktop: a step is active when it crosses the middle of the viewport.
   Narrow: the graphic covers the top ~60%, so the line sits at 70%: a step
   activates once it has come up into the free area below the graphic. */
(function (V) {
  const sections = [];

  function observe(entry) {
    if (entry.io) entry.io.disconnect();
    const margin = V.util.isNarrow() ? "-70% 0px -29.5% 0px" : "-50% 0px -49.5% 0px";
    entry.io = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          if (!r.isIntersecting) continue;
          const i = entry.steps.indexOf(r.target);
          if (i === entry.current) continue;
          entry.current = i;
          entry.steps.forEach((s, j) => s.classList.toggle("is-active", j === i));
          entry.onStep(i);
        }
      },
      { rootMargin: margin, threshold: 0 }
    );
    entry.steps.forEach((s) => entry.io.observe(s));
  }

  V.scroller = function (section, onStep) {
    const entry = { steps: [...section.querySelectorAll(".step")], current: -1, onStep, io: null };
    sections.push(entry);
    observe(entry);
    return entry;
  };

  window.matchMedia("(max-width: 899px)").addEventListener("change", () => sections.forEach(observe));
})(window.Viz);
