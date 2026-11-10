/* "Show as table" twin for every chart: the accessible, colour-free equivalent.
   Inline below the chart, except for pinned scrolly graphics, which have no room
   to grow - those open the table in a modal <dialog>. */
(function (V) {
  function render(container, spec) {
    container.replaceChildren();
    const table = document.createElement("table");
    if (spec.caption) {
      const cap = document.createElement("caption");
      cap.textContent = spec.caption;
      table.append(cap);
    }
    const head = table.createTHead().insertRow();
    for (const c of spec.columns) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = c;
      head.append(th);
    }
    const body = table.createTBody();
    for (const r of spec.rows) {
      const tr = body.insertRow();
      r.forEach((cell, i) => {
        const td = i === 0 ? document.createElement("th") : document.createElement("td");
        if (i === 0) td.scope = "row";
        td.textContent = cell;
        tr.append(td);
      });
    }
    container.append(table);
  }

  function attachDialog(fig, button, getSpec) {
    const dialog = document.getElementById("table-dialog");
    if (!dialog) return;
    button.addEventListener("click", () => {
      dialog.querySelector(".table-dialog__title").textContent = fig.querySelector(".fig__title").textContent;
      render(dialog.querySelector(".table-view"), getSpec());
      dialog.showModal();
    });
  }

  V.table = {
    attach(fig, getSpec) {
      const button = fig.querySelector(".table-toggle");
      const view = fig.querySelector(".table-view");
      if (!button || !view) return;
      if (fig.closest(".scrolly__graphic")) {
        button.removeAttribute("aria-expanded");
        button.setAttribute("aria-haspopup", "dialog");
        attachDialog(fig, button, getSpec);
        return;
      }
      button.addEventListener("click", () => {
        const open = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!open));
        button.querySelector("span").textContent = open ? "Show as table" : "Hide table";
        if (!open) render(view, getSpec());
        view.hidden = open;
      });
    },
  };
})(window.Viz);
