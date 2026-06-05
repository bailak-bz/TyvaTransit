(function () {
  function isModesDesktop(section) {
    return (
      section.classList.contains("swipe-section--modes") &&
      window.matchMedia("(min-width: 768px)").matches
    );
  }

  function initTrack(track) {
    var section = track.closest(".swipe-section");
    if (!section) return;

    if (isModesDesktop(section)) return;

    var viewport = track.closest(".swipe-viewport");
    var dotsWrap = section.querySelector("[data-swipe-dots]");
    var hint = section.querySelector("[data-swipe-hint]");
    var prevBtn = viewport && viewport.querySelector("[data-swipe-prev]");
    var nextBtn = viewport && viewport.querySelector("[data-swipe-next]");
    var slides = track.querySelectorAll(".swipe-slide");
    if (!slides.length || !dotsWrap) return;

    if (track._swipeInited) return;
    track._swipeInited = true;

    var dots = [];
    var activeIndex = 0;

    function goTo(index) {
      var i = Math.max(0, Math.min(index, slides.length - 1));
      slides[i].scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
      setActive(i);
    }

    slides.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "swipe-dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", "Слайд " + (i + 1));
      dot.addEventListener("click", function () {
        goTo(i);
      });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    function setActive(index) {
      activeIndex = index;
      dots.forEach(function (d, i) {
        d.classList.toggle("is-active", i === index);
      });
      if (hint) {
        hint.classList.toggle("is-hidden", index > 0);
      }
      if (prevBtn) {
        prevBtn.disabled = index <= 0;
      }
      if (nextBtn) {
        nextBtn.disabled = index >= slides.length - 1;
      }
    }

    function updateFromScroll() {
      var trackRect = track.getBoundingClientRect();
      var center = trackRect.left + trackRect.width / 2;
      var best = 0;
      var bestDist = Infinity;

      slides.forEach(function (slide, i) {
        var r = slide.getBoundingClientRect();
        var slideCenter = r.left + r.width / 2;
        var dist = Math.abs(slideCenter - center);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });

      setActive(best);
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goTo(activeIndex - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goTo(activeIndex + 1);
      });
    }

    track.addEventListener(
      "keydown",
      function (e) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goTo(activeIndex - 1);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          goTo(activeIndex + 1);
        }
      }
    );

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              var idx = Array.prototype.indexOf.call(slides, entry.target);
              if (idx >= 0) setActive(idx);
            }
          });
        },
        { root: track, threshold: [0.5, 0.65, 0.85] }
      );
      slides.forEach(function (s) {
        observer.observe(s);
      });
    }

    track.addEventListener(
      "scroll",
      function () {
        window.clearTimeout(track._swipeTimer);
        track._swipeTimer = window.setTimeout(updateFromScroll, 60);
      },
      { passive: true }
    );

    setActive(0);
  }

  window.TyvaSwipe = { initTrack: initTrack };

  document.querySelectorAll("[data-swipe-track]").forEach(function (track) {
    if (track.hasAttribute("data-home-trips")) return;
    initTrack(track);
  });
})();
