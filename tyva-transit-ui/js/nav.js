(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (!header || !toggle || !nav) return;

  function setOpen(open) {
    header.classList.toggle("is-nav-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  }

  toggle.addEventListener("click", function () {
    setOpen(!header.classList.contains("is-nav-open"));
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setOpen(false);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });

  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width: 640px)").matches) setOpen(false);
  });
})();
