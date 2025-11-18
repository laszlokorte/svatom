import init from "./svelte/init";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init(document.getElementById("app-root"));
  });
} else {
  init(document.getElementById("app-root"));
}
