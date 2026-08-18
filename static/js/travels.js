  (function () {
    "use strict";
    if (typeof THREE === "undefined") return;

    /* =========================================================================
   
       Fields:
         name        shown on the card (required)
         lat, lon    decimal degrees (required)
         wiki        Wikipedia article title used to fetch a landmark photo.
                     Defaults to `name` if omitted. Use the exact article title
                     for accuracy, e.g. "Isfahan", "Naples", "Langkawi".
         image       OPTIONAL. If you set this to your own photo URL / /static path,
                     it is used instead of Wikipedia.
         text        your caption
       ========================================================================= */
    var PLACES = window.PLACES || [];

    // ---- Wikipedia lead-image fetch (CORS-enabled REST summary endpoint) ----
    // Cached per article so we only fetch each once. Returns {img, credit}.
    var wikiCache = {};
    function fetchWikiImage(title) {
      if (wikiCache[title]) return wikiCache[title];
      var url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g, "_"));
      var p = fetch(url, { headers: { "Accept": "application/json" } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d) return { img: null, credit: "" };
          var img = (d.originalimage && d.originalimage.source) || (d.thumbnail && d.thumbnail.source) || null;
          return { img: img, credit: img ? "Wikipedia" : "" };
        })
        .catch(function () { return { img: null, credit: "" }; });
      wikiCache[title] = p;
      return p;
    }

    var canvas = document.getElementById("globe");
    var card = document.getElementById("card");
    var cardImgWrap = card.querySelector(".c-imgwrap");
    var cardPlace = card.querySelector(".c-place");
    var cardText = card.querySelector(".c-text");
    var cardCredit = card.querySelector(".c-credit");

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 3.2);

    var R = 1;
    var globe = new THREE.Group();
    scene.add(globe);

    // ---- Earth ----
    var earthMat = new THREE.MeshPhongMaterial({ color: 0x1a3a5a, shininess: 18, specular: 0x333333 });
    var earth = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 96), earthMat);
    globe.add(earth);
    var loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    function loadFirst(urls, onload) { var i = 0; (function attempt() { if (i >= urls.length) return; loader.load(urls[i], onload, undefined, function () { i++; attempt(); }); })(); }
    var RD = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/";
    loadFirst([RD + "earth_atmos_2048.jpg", "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg", "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"],
      function (tex) { if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace; earthMat.map = tex; earthMat.color.set(0xffffff); earthMat.needsUpdate = true; });
    loadFirst([RD + "earth_specular_2048.jpg"], function (tex) { earthMat.specularMap = tex; earthMat.specular.set(0x555555); earthMat.needsUpdate = true; });
    loadFirst([RD + "earth_normal_2048.jpg"], function (tex) { earthMat.bumpMap = tex; earthMat.bumpScale = 0.04; earthMat.needsUpdate = true; });
    var cloudMesh = null;
    loadFirst([RD + "earth_clouds_1024.png"], function (tex) { cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 1.01, 64, 64), new THREE.MeshLambertMaterial({ map: tex, transparent: true, opacity: 0.4, depthWrite: false })); globe.add(cloudMesh); });

    scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.045, 48, 48), new THREE.MeshBasicMaterial({ color: 0x4a90d0, transparent: true, opacity: 0.12, side: THREE.BackSide })));

    var starGeo = new THREE.BufferGeometry(), sp = [];
    for (var i = 0; i < 600; i++) { var r = 20 + Math.random() * 30, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1); sp.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)); }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 })));

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var sun = new THREE.DirectionalLight(0xfff2e0, 1.0); sun.position.set(3, 2, 3); scene.add(sun);

    function latLonToVec3(lat, lon, radius) {
      var phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
      return new THREE.Vector3(-(radius * Math.sin(phi) * Math.cos(theta)), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
    }

    // ---- realistic brass-and-glass map pins ----
    var brass = new THREE.MeshStandardMaterial({ color: 0xb9932f, metalness: 0.95, roughness: 0.28 });
    var brassDark = new THREE.MeshStandardMaterial({ color: 0x8a6f22, metalness: 0.95, roughness: 0.35 });
    var glassHead = new THREE.MeshStandardMaterial({ color: 0x9e1f1b, metalness: 0.1, roughness: 0.15, emissive: 0x2a0605, emissiveIntensity: 0.5 });
    var needleGeo = new THREE.CylinderGeometry(0.004, 0.010, 0.13, 10);
    var collarGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 12);
    var beadGeo = new THREE.SphereGeometry(0.028, 20, 16);

    var pins = [];
    PLACES.forEach(function (place) {
      var surf = latLonToVec3(place.lat, place.lon, R);
      var normal = surf.clone().normalize();
      var pin = new THREE.Group();
      pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      pin.position.copy(surf);
      var needle = new THREE.Mesh(needleGeo, brass); needle.position.y = 0.065; pin.add(needle);
      var collar = new THREE.Mesh(collarGeo, brassDark); collar.position.y = 0.128; pin.add(collar);
      var bead = new THREE.Mesh(beadGeo, glassHead); bead.position.y = 0.155; bead.scale.set(1, 1.15, 1); pin.add(bead);
      var glint = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd9c8 }));
      glint.position.set(-0.01, 0.166, 0.016); pin.add(glint);
      bead.userData = { place: place, normal: normal };
      globe.add(pin); pins.push(bead);
    });

    // ---- interaction ----
    var dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, rotY = 0, rotX = 0, autoSpin = true;
    canvas.addEventListener("pointerdown", function (e) { dragging = true; lastX = downX = e.clientX; lastY = downY = e.clientY; });
    window.addEventListener("pointerup", function (e) {
      dragging = false;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) { sticky = (hovered && hovered === stickyTarget) ? null : hovered; stickyTarget = hovered; }
    });
    window.addEventListener("pointermove", function (e) {
      if (dragging) { rotY += (e.clientX - lastX) * 0.005; rotX = Math.max(-1.2, Math.min(1.2, rotX + (e.clientY - lastY) * 0.005)); lastX = e.clientX; lastY = e.clientY; autoSpin = false; }
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    canvas.addEventListener("wheel", function (e) { e.preventDefault(); camera.position.z = Math.max(1.6, Math.min(6, camera.position.z + e.deltaY * 0.002)); }, { passive: false });
    window.addEventListener("resize", function () { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

    // ---- hover / popup ----
    var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(-2, -2), hovered = null, sticky = null, stickyTarget = null, tmp = new THREE.Vector3();
    var currentTitle = null;
    function nearSide(head) {
      var wn = head.userData.normal.clone().applyQuaternion(globe.quaternion);
      var toCam = camera.position.clone().sub(globe.position).normalize();
      return wn.dot(toCam) > 0.15;
    }
    function setCardImage(place) {
      // own photo wins; otherwise fetch the Wikipedia lead image
      if (place.image) {
        cardImgWrap.innerHTML = '<img alt="' + place.name + '">';
        cardImgWrap.querySelector("img").src = place.image;
        cardCredit.textContent = "";
        return;
      }
      cardImgWrap.innerHTML = '<span class="c-loading">loading…</span>';
      cardCredit.textContent = "";
      var title = place.wiki || place.name;
      var reqTitle = title;
      fetchWikiImage(title).then(function (res) {
        // ignore if the user has since hovered a different pin
        if (currentTitle !== reqTitle) return;
        if (res.img) {
          cardImgWrap.innerHTML = '<img alt="' + place.name + '">';
          cardImgWrap.querySelector("img").src = res.img;
          cardCredit.textContent = "photo: Wikipedia";
        } else {
          cardImgWrap.innerHTML = '<span class="c-loading">no image found</span>';
        }
      });
    }
    function showCard(head) {
      var p = head.userData.place;
      var title = p.wiki || p.name;
      if (title !== currentTitle) { currentTitle = title; cardPlace.textContent = p.name; cardText.textContent = p.text || ""; setCardImage(p); }
      card.style.display = "block";
      head.getWorldPosition(tmp); tmp.project(camera);
      var x = (tmp.x * 0.5 + 0.5) * window.innerWidth, y = (-tmp.y * 0.5 + 0.5) * window.innerHeight;
      card.style.left = Math.max(120, Math.min(window.innerWidth - 120, x)) + "px";
      card.style.top = Math.max(160, y - 18) + "px";
    }
    function updateHover() {
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(pins, false).filter(function (h) { return nearSide(h.object); });
      hovered = hits.length ? hits[0].object : null;
      canvas.classList.toggle("pointing", !!hovered);
      var target = sticky || hovered;
      if (target && nearSide(target)) showCard(target);
      else { card.style.display = "none"; sticky = null; currentTitle = null; }
    }

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      var dt = clock.getDelta();
      if (autoSpin && !dragging) rotY += dt * 0.08;
      globe.rotation.y = rotY; globe.rotation.x = rotX;
      if (cloudMesh) cloudMesh.rotation.y += dt * 0.02;
      updateHover();
      renderer.render(scene, camera);
    }
    animate();
  })();
