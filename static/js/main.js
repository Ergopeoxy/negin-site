/* Small UI behaviors: mobile nav toggle + scroll-reveal for sections. */
(function () {
  "use strict";

  // Mobile nav
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Scroll reveal (skipped when the user prefers reduced motion)
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sections = document.querySelectorAll(".section .card, .section-title, .about-text");
  if (!reducedMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    sections.forEach((el) => {
      el.classList.add("reveal");
      observer.observe(el);
    });
  }


  // Gallery carousel arrows
  document.querySelectorAll(".carousel").forEach((carousel) => {
    const track = carousel.querySelector(".carousel-track");
    const step = () => track.querySelector(".gallery-item").offsetWidth + 20;
    carousel.querySelector(".prev").addEventListener("click", () =>
      track.scrollBy({ left: -step(), behavior: "smooth" }));
    carousel.querySelector(".next").addEventListener("click", () =>
      track.scrollBy({ left: step(), behavior: "smooth" }));
  });

    // Gallery lightbox — click a card to view full size
  const galleryImgs = document.querySelectorAll(".gallery-item img");
  if (galleryImgs.length) {
    const lightbox = document.createElement("figure");
    lightbox.className = "lightbox";
    lightbox.innerHTML = "<img alt=''><figcaption></figcaption>";
    document.body.appendChild(lightbox);
    const lbImg = lightbox.querySelector("img");
    const lbCap = lightbox.querySelector("figcaption");

    galleryImgs.forEach((img) => {
      img.addEventListener("click", () => {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lbCap.textContent = img.alt;
        lightbox.classList.add("open");
      });
    });

    lightbox.addEventListener("click", () => lightbox.classList.remove("open"));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") lightbox.classList.remove("open");
    });
  }

  document.querySelectorAll("#writings-book .page-scroll").forEach(function (area) {
        ["touchstart", "touchmove", "pointerdown", "pointermove", "wheel"].forEach(function (evt) {
          area.addEventListener(evt, function (e) {
            e.stopPropagation();
          }, { passive: evt !== "touchmove" });
        });
      });

    // Pull-cord light switch
  const pull = document.getElementById("pull-light");
  if (pull) {
    const apply = (light) => {
      document.body.classList.toggle("light-theme", light);
      pull.setAttribute("aria-pressed", String(light));
    };
    // remember across page loads
    apply(localStorage.getItem("theme") === "light");

    pull.addEventListener("click", () => {
      const nowLight = !document.body.classList.contains("light-theme");
      apply(nowLight);
      localStorage.setItem("theme", nowLight ? "light" : "dark");

      pull.classList.add("pulling");
      pull.classList.add("swing");
      setTimeout(() => pull.classList.remove("pulling"), 160);
      setTimeout(() => pull.classList.remove("swing"), 1100);
    });


      // Personal dropdown
  var drop = document.querySelector(".nav-drop-toggle");
  if (drop) {
    var menu = drop.parentElement.querySelector(".nav-drop-menu");
    drop.addEventListener("click", function (e) {
      e.preventDefault();
      var open = menu.classList.toggle("open");
      drop.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", function (e) {
      if (!drop.parentElement.contains(e.target)) { menu.classList.remove("open"); drop.setAttribute("aria-expanded", "false"); }
    });
  }


  }

})();
