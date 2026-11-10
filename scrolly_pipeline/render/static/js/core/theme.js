/* Light / dark theme: follows the OS until the reader picks one; charts re-render on change. */
(function (V) {
  const KEY = "deleting-no-theme";
  const root = document.documentElement;
  const osDark = window.matchMedia("(prefers-color-scheme: dark)");

  function stored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }
  function store(value) {
    try {
      localStorage.setItem(KEY, value);
    } catch (e) {
      /* private mode: the choice just isn't remembered */
    }
  }
  const current = () => root.dataset.theme || (osDark.matches ? "dark" : "light");
  const announce = () => document.dispatchEvent(new CustomEvent("themechange"));

  function label(button) {
    const next = current() === "dark" ? "light" : "dark";
    button.setAttribute("aria-label", `Switch to ${next} mode`);
    button.querySelector("span").textContent = next === "dark" ? "Dark mode" : "Light mode";
  }

  V.theme = {
    init() {
      const saved = stored();
      if (saved === "light" || saved === "dark") root.dataset.theme = saved;
      const button = document.querySelector(".theme-toggle");
      if (button) {
        label(button);
        button.addEventListener("click", () => {
          root.dataset.theme = current() === "dark" ? "light" : "dark";
          store(root.dataset.theme);
          label(button);
          announce();
        });
      }
      osDark.addEventListener("change", () => {
        if (!root.dataset.theme) announce();
        if (button) label(button);
      });
    },
  };
})(window.Viz);
