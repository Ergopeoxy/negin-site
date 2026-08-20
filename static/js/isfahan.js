// اصفهان — train-journey logic. Builds a journey (track + stations + train +
// detail card + controls) inside each [data-journey] container from window.ISFAHAN.
(function () {
  "use strict";

  var DATA = window.ISFAHAN || { landmarks: [], arts: [], foods: [] };
  var wikiCache = {};

  function fetchWiki(title) {
    if (wikiCache[title]) return wikiCache[title];
    var url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g, "_"));
    var p = fetch(url)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || d.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") {
          return { extract: "No description yet — add your own here.", img: null };
        }
        return {
          extract: d.extract || "No description yet — add your own here.",
          img: (d.thumbnail && d.thumbnail.source) || (d.originalimage && d.originalimage.source) || null
        };
      })
      .catch(function () { return { extract: "Could not load description.", img: null }; });
    wikiCache[title] = p;
    return p;
  }

  function buildJourney(root) {
    var key = root.getAttribute("data-journey");
    var stops = DATA[key] || [];
    if (!stops.length) return;

    root.innerHTML =
      '<div class="railway"><div class="track">' +
        '<div class="ties"></div><div class="rail"></div>' +
        '<div class="train"><div class="body"></div><div class="wheels"><span></span><span></span></div><div class="smoke"></div></div>' +
        '<div class="stations"></div>' +
      '</div></div>' +
      '<div class="detail"><div class="card">' +
        '<div class="img"></div>' +
        '<div class="cbody">' +
          '<div class="fa-name" dir="rtl"></div>' +
          '<div class="en-name"></div>' +
          '<div class="desc"><span class="loading">boarding…</span></div>' +
          '<div class="credit"></div>' +
        '</div>' +
      '</div></div>' +
      '<div class="controls"><button class="j-prev">‹ previous</button><button class="j-next">next ›</button></div>';

    var stationsEl = root.querySelector(".stations");
    var train = root.querySelector(".train");
    var dImg = root.querySelector(".img"), dFa = root.querySelector(".fa-name"),
        dEn = root.querySelector(".en-name"), dDesc = root.querySelector(".desc"),
        dCredit = root.querySelector(".credit");
    var current = 0;

    stops.forEach(function (stop, i) {
      var b = document.createElement("button");
      b.className = "station";
      b.innerHTML = '<span class="star"></span><span class="label">' + stop.en + '</span>';
      b.addEventListener("click", function () { goTo(i); });
      stationsEl.appendChild(b);
    });
    var stationEls = stationsEl.querySelectorAll(".station");

    function positionTrain() {
      var s = stationEls[current];
      if (!s) return;
      var base = stationsEl.getBoundingClientRect(), r = s.getBoundingClientRect();
      train.style.left = (r.left - base.left + r.width / 2) + "px";
    }

    function goTo(i) {
      current = i;
      stationEls.forEach(function (el, k) { el.classList.toggle("active", k === i); });
      positionTrain();
      var stop = stops[i], reqTitle = stop.wiki;
      dFa.textContent = stop.fa; dEn.textContent = stop.en;
      dDesc.innerHTML = '<span class="loading">boarding…</span>';
      dImg.style.backgroundImage = ""; dImg.classList.add("empty"); dCredit.textContent = "";
      fetchWiki(stop.wiki).then(function (res) {
        if (stops[current].wiki !== reqTitle) return; // user moved on
        dDesc.textContent = res.extract;
        if (res.img) { dImg.style.backgroundImage = "url('" + res.img + "')"; dImg.classList.remove("empty"); }
        dCredit.textContent = res.img ? "متن و تصویر: ویکی‌پدیا · Wikipedia" : "متن: ویکی‌پدیا · Wikipedia";
      });
    }

    root.querySelector(".j-next").addEventListener("click", function () { goTo((current + 1) % stops.length); });
    root.querySelector(".j-prev").addEventListener("click", function () { goTo((current - 1 + stops.length) % stops.length); });
    window.addEventListener("resize", positionTrain);

    goTo(0);
    setTimeout(positionTrain, 120);
  }

  document.querySelectorAll("[data-journey]").forEach(buildJourney);
})();
