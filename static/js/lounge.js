  (function () {
    "use strict";

    var mt = document.getElementById("music-toggle");
    var mb = document.getElementById("music-body");
    mt.addEventListener("click", function () {
      mb.classList.toggle("collapsed");
      mt.querySelector(".toggle").textContent = mb.classList.contains("collapsed") ? "▸" : "▾";
    });

    if (typeof THREE === "undefined") return;

    var canvas = document.getElementById("scene");
    canvas.focus();
    canvas.addEventListener("pointerdown", function () { canvas.focus(); });

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x171526, 0.028);

    var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.rotation.order = "YXZ";

    // spawn: south of the fire, looking NORTH (-Z) straight at the cabin. yaw=0 looks -Z.
    var player = { x: 0, z: 8, yaw: 0, pitch: 0.02, eye: 1.7, fov: 62 };
    var FIRE = { x: 0, z: 4 };

    // collision zones
    function allowed(x, z) {
      if (x < -8.5 || x > 8.5 || z < -8.5 || z > 9) return false;
      if (x > -3.6 && x < 3.6 && z > -3.6 && z < 2.6) return false;   // cabin
      if (Math.hypot(x - FIRE.x, z - FIRE.z) < 1.4) return false;     // fire
      return true;
    }
    function applyCamera() {
      camera.position.set(player.x, player.eye, player.z);
      camera.rotation.y = player.yaw; camera.rotation.x = player.pitch;
    }

    var box = new THREE.BoxGeometry(1, 1, 1);
    function mat(c, basic) { return basic ? new THREE.MeshBasicMaterial({ color: c }) : new THREE.MeshLambertMaterial({ color: c }); }
    function vox(x, y, z, color, sx, sy, sz, basic) {
      var m = new THREE.Mesh(box, mat(color, basic));
      m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1);
      world.add(m); return m;
    }
    var world = new THREE.Group(); scene.add(world);

    // ---------------- ground + snow dusting ----------------
    var GRASS = [0x466a30, 0x527436, 0x3f5e2c], SNOW = 0xe4ecf2;
    var RIVER_X = -5; // river runs along z at x = -5 (two blocks wide)
    function isRiver(x, z) { return (x === RIVER_X || x === RIVER_X - 1); }
    for (var gx = -9; gx <= 9; gx++) for (var gz = -9; gz <= 9; gz++) {
      if (isRiver(gx, gz)) continue; // water fills these
      var top = (gx + gz) % 4 === 0 ? SNOW : GRASS[(gx * 7 + gz + 63) % 3];
      vox(gx, -0.5, gz, top);
      vox(gx, -1.5, gz, 0x3a2a1a);
    }

    // ---------------- river (animated water) ----------------
    var water = [];
    for (var wz = -9; wz <= 9; wz++) {
      [RIVER_X, RIVER_X - 1].forEach(function (wx) {
        var w = vox(wx, -0.75, wz, 0x2f6f9e);
        w.userData = { off: (wx + wz) * 0.6 };
        water.push(w);
      });
      vox(RIVER_X, -1.5, wz, 0x244a63); vox(RIVER_X - 1, -1.5, wz, 0x244a63); // riverbed
    }
    // plank bridge across the river at z = 6 (between player and left area)
    for (var bx = RIVER_X - 1; bx <= RIVER_X; bx++) {
      vox(bx, -0.35, 6, 0x6b4a2a); vox(bx, -0.35, 7, 0x6b4a2a);
    }
    vox(RIVER_X - 1.5, 0.1, 6.5, 0x4a3018, 0.2, 0.6, 0.2);
    vox(RIVER_X + 0.5, 0.1, 6.5, 0x4a3018, 0.2, 0.6, 0.2);

    // ---------------- stone path to the door ----------------
    for (var pz = 3; pz <= 8; pz++) { vox(0, -0.42, pz, 0x8a8578, 1.1, 0.2, 1.1); }

    // ---------------- detailed cabin ----------------
    // footprint x:-3..3, z:-3..2 ; walls 4 tall (y 0..3)
    var LOG = 0x8a5a30, LOG_D = 0x6b4322, TRIM = 0x4a2f18, DOOR = 0x3a2412, WIN = 0xffd27a, STONE = 0x6f6a60;
    function logColor(x, y, z) { return (y % 2 === 0) ? LOG : LOG_D; }
    var FX0 = -3, FX1 = 3, FZ0 = -3, FZ1 = 2, WALL_TOP = 3;
    for (var wy = 0; wy <= WALL_TOP; wy++) {
      for (var xx = FX0; xx <= FX1; xx++) {
        // front (z=FZ1): leave a door hole (x 0, y 0..1) and window holes
        var frontHole = (xx === 0 && wy <= 1);
        if (!frontHole) vox(xx, wy, FZ1, logColor(xx, wy, FZ1));
        vox(xx, wy, FZ0, logColor(xx, wy, FZ0)); // back
      }
      for (var zz = FZ0 + 1; zz <= FZ1 - 1; zz++) {
        vox(FX0, wy, zz, logColor(FX0, wy, zz)); // left
        vox(FX1, wy, zz, logColor(FX1, wy, zz)); // right
      }
    }
    // stone foundation ring
    for (var sx = FX0; sx <= FX1; sx++) { vox(sx, -0.5, FZ1, STONE); vox(sx, -0.5, FZ0, STONE); }
    // door + frame
    vox(0, 0, FZ1, DOOR); vox(0, 1, FZ1, DOOR);
    vox(-0.5, 0, FZ1 + 0.02, TRIM, 0.15, 2.2, 0.15, false);
    vox(0.5, 0, FZ1 + 0.02, TRIM, 0.15, 2.2, 0.15, false);
    // glowing windows with dark frames  (front + sides)
    var winMats = [];
    function windowAt(x, y, z, faceZ) {
      var wm = new THREE.MeshBasicMaterial({ color: WIN });
      var m = new THREE.Mesh(box, wm); m.position.set(x, y, z); m.scale.set(faceZ ? 0.7 : 0.2, 0.7, faceZ ? 0.2 : 0.7);
      world.add(m); winMats.push(wm);
      // frame cross
      vox(x, y, z + (faceZ ? 0.06 : 0), TRIM, faceZ ? 0.8 : 0.12, 0.12, faceZ ? 0.12 : 0.8);
      vox(x, y, z + (faceZ ? 0.06 : 0), TRIM, faceZ ? 0.12 : 0.12, 0.8, faceZ ? 0.12 : 0.8);
    }
    windowAt(-2, 1.5, FZ1 + 0.02, true);
    windowAt(2, 1.5, FZ1 + 0.02, true);
    windowAt(FX0 - 0.02, 1.5, -1, false);
    windowAt(FX1 + 0.02, 1.5, -1, false);

    // ---------------- gable roof (centered, fixed) ----------------
    // ridge runs along Z; roof slopes down along X. Rows step up, narrower.
    var roofRows = [
      { y: 3.4, half: 3.7 }, { y: 3.9, half: 3.0 }, { y: 4.4, half: 2.3 },
      { y: 4.9, half: 1.6 }, { y: 5.4, half: 0.9 }, { y: 5.8, half: 0.35 }
    ];
    var ROOF = 0x9a3326, ROOF_D = 0x7a2519;
    roofRows.forEach(function (row, idx) {
      vox(0, row.y, -0.5, idx % 2 === 0 ? ROOF : ROOF_D, row.half * 2, 0.5, 6.4);
    });
    // gable triangle fill on front (z=FZ1) and back (z=FZ0) so you don't see under the roof
    var gable = [ {y:3.2,half:3}, {y:3.7,half:2.4}, {y:4.2,half:1.8}, {y:4.7,half:1.2}, {y:5.2,half:0.6} ];
    gable.forEach(function (g) {
      vox(0, g.y, FZ1 + 0.1, LOG_D, g.half * 2, 0.5, 0.15);
      vox(0, g.y, FZ0 - 0.1, LOG_D, g.half * 2, 0.5, 0.15);
    });
    // chimney with a little stone detail
    vox(2, 3.4, -2, STONE); vox(2, 4.2, -2, STONE); vox(2, 5.0, -2, 0x555050);

    // ---------------- torches (glow blocks + a couple of real lights) ----------------
    var torchMats = [];
    function torch(x, z, withLight) {
      vox(x, 0, z, 0x4a3018, 0.18, 1.0, 0.18);       // post
      var tm = new THREE.MeshBasicMaterial({ color: 0xffb347 });
      var head = new THREE.Mesh(box, tm); head.position.set(x, 1.15, z); head.scale.set(0.28, 0.28, 0.28);
      world.add(head); torchMats.push({ m: tm, base: 0xffb347 });
      if (withLight) {
        var pl = new THREE.PointLight(0xffa542, 0.9, 6, 2);
        pl.position.set(x, 1.3, z); scene.add(pl);
      }
    }
    torch(-1.2, 3.2, true); torch(1.2, 3.2, true);   // flank the path/door
    torch(-4, 8, false); torch(4, -4, false); torch(5, 5, false);

    // wall lanterns beside the door (glow)
    var lanternMats = [];
    [[-1, 2, FZ1 + 0.15], [1, 2, FZ1 + 0.15]].forEach(function (p) {
      var lm = new THREE.MeshBasicMaterial({ color: 0xffcf6a });
      var m = new THREE.Mesh(box, lm); m.position.set(p[0], p[1], p[2]); m.scale.set(0.22, 0.34, 0.22);
      world.add(m); lanternMats.push(lm);
    });

    // ---------------- fuller trees ----------------
    function tree(x, z, big) {
      var h = big ? 3 : 2;
      for (var ty = 0; ty < h; ty++) vox(x, ty, z, 0x5a3a1e);
      vox(x, h, z, 0x2c5426, big ? 3.0 : 2.4, 1, big ? 3.0 : 2.4);
      vox(x, h + 0.9, z, 0x336330, big ? 2.3 : 1.8, 1, big ? 2.3 : 1.8);
      vox(x, h + 1.8, z, 0x3d7336, big ? 1.5 : 1.2, 1, big ? 1.5 : 1.2);
      vox(x, h + 2.5, z, 0x468040, 0.8, 1, 0.8);
      vox(x, h + 3.1, z, SNOW, 0.6, 0.4, 0.6);
    }
    tree(-7, -5, true); tree(7, -4, true); tree(-7.5, 3, false); tree(6.5, 4, true);
    tree(-8, 7, false); tree(8, 6, true); tree(3, -6, false); tree(-3, -6, true); tree(7.5, -7, false);

    // ---------------- flowers ----------------
    var FLOWER = [0xd94f4f, 0xffd447, 0xffffff, 0xb06fd8, 0xff8bbf];
    function flower(x, z) {
      if (!allowed(x, z) || isRiver(x, z)) return;
      vox(x, 0.15, z, 0x3d7336, 0.12, 0.3, 0.12);
      vox(x, 0.38, z, FLOWER[Math.floor(Math.random() * FLOWER.length)], 0.28, 0.2, 0.28, true);
    }
    var fspots = [[-2,6],[2,6],[-3,7],[3,7],[-6,-3],[6,-2],[-2,-5],[2,-5],[5,2],[-5.5,0],[6,8],[-6,6],[4,7],[-4,8]];
    fspots.forEach(function (p) { flower(p[0], p[1]); });

    // ---------------- campfire ----------------
    vox(FIRE.x - 0.6, 0, FIRE.z, 0x4a3018, 0.4, 0.4, 1.6);
    vox(FIRE.x + 0.6, 0, FIRE.z, 0x4a3018, 0.4, 0.4, 1.6);
    vox(FIRE.x, 0, FIRE.z - 0.6, 0x3f2a15, 1.6, 0.4, 0.4);
    vox(FIRE.x, 0, FIRE.z + 0.6, 0x3f2a15, 1.6, 0.4, 0.4);
    var flameCols = [0xffd447, 0xff8a2b, 0xff5a1a], flames = [];
    for (var fi = 0; fi < 8; fi++) {
      var sc = 0.5 - fi * 0.04;
      var fl = new THREE.Mesh(box, mat(flameCols[fi % 3], true));
      fl.scale.set(sc, sc, sc);
      fl.userData = { base: 0.4 + fi * 0.2, speed: 2 + Math.random() * 3, off: Math.random() * 6.28, sx: sc };
      fl.position.set(FIRE.x, fl.userData.base, FIRE.z);
      world.add(fl); flames.push(fl);
    }

    // ---------------- the cat (hi Ori): sits near cabin, blinks & licks paw ----------------
    var cat = new THREE.Group();
    var CAT = 0x1a1a1a, CAT_D = 0x0e0e0e, EYE = 0xffd447, NOSE = 0xd98b8b;
    function cv(x, y, z, c, sx, sy, sz, basic) { var m = new THREE.Mesh(box, mat(c, basic)); m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); cat.add(m); return m; }
    cv(0, 0.35, 0, CAT, 0.9, 0.6, 1.4);
    cv(0, 0.6, 0.75, CAT, 0.7, 0.7, 0.6);
    cv(-0.2, 0.95, 0.85, CAT_D, 0.18, 0.3, 0.18);
    cv(0.2, 0.95, 0.85, CAT_D, 0.18, 0.3, 0.18);
    var eyeL = cv(-0.13, 0.62, 1.06, EYE, 0.12, 0.12, 0.08, true);
    var eyeR = cv(0.13, 0.62, 1.06, EYE, 0.12, 0.12, 0.08, true);
    cv(0, 0.5, 1.08, NOSE, 0.1, 0.08, 0.06, true);
    var pawFL = cv(-0.28, 0.1, 0.4, CAT_D, 0.2, 0.4, 0.2);
    cv(0.28, 0.1, 0.4, CAT_D, 0.2, 0.4, 0.2);
    cv(-0.28, 0.1, -0.4, CAT_D, 0.2, 0.4, 0.2);
    cv(0.28, 0.1, -0.4, CAT_D, 0.2, 0.4, 0.2);
    var tail = cv(0, 0.55, -0.85, CAT_D, 0.16, 0.16, 0.7);
    scene.add(cat);
    cat.position.set(2.6, 0, 3.0); cat.rotation.y = -0.8;
    var catIdle = { blink: 2 + Math.random() * 3, lick: 4 + Math.random() * 5, licking: 0 };

    // ---------------- lighting ----------------
    scene.add(new THREE.AmbientLight(0x2a2838, 1.5));
    var moon = new THREE.DirectionalLight(0x9fb0d8, 0.4); moon.position.set(-8, 14, -6); scene.add(moon);
    var fireLight = new THREE.PointLight(0xff7a2a, 2.6, 20, 2);
    fireLight.position.set(FIRE.x, 1, FIRE.z); scene.add(fireLight);

    // ---------------- moon + stars ----------------
    var moonMesh = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12), mat(0xf0eede, true));
    moonMesh.position.set(-16, 17, -20); scene.add(moonMesh);
    var starGeo = new THREE.BufferGeometry(), starPos = [];
    for (var s = 0; s < 320; s++) {
      var sr = 60 + Math.random() * 40, st = Math.random() * Math.PI * 2, sp = Math.random() * Math.PI * 0.5;
      starPos.push(sr * Math.sin(sp) * Math.cos(st), 20 + sr * Math.cos(sp) * 0.6, sr * Math.sin(sp) * Math.sin(st));
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35 })));

    // ---------------- snow ----------------
    var snowGeo = new THREE.BufferGeometry(), snowCount = 450, snowArr = new Float32Array(snowCount * 3);
    for (var i = 0; i < snowCount; i++) {
      snowArr[i * 3] = (Math.random() - 0.5) * 38;
      snowArr[i * 3 + 1] = Math.random() * 26;
      snowArr[i * 3 + 2] = (Math.random() - 0.5) * 38;
    }
    snowGeo.setAttribute("position", new THREE.BufferAttribute(snowArr, 3));
    var snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, transparent: true, opacity: 0.85 }));
    scene.add(snow);

    // ---------------- input: look ----------------
    var dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener("pointerdown", function (e) { dragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener("pointerup", function () { dragging = false; });
    window.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      player.yaw -= (e.clientX - lastX) * 0.005;
      player.pitch = Math.max(-0.9, Math.min(0.6, player.pitch - (e.clientY - lastY) * 0.004));
      lastX = e.clientX; lastY = e.clientY;
    });
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      player.fov = Math.max(35, Math.min(75, player.fov + e.deltaY * 0.03));
      camera.fov = player.fov; camera.updateProjectionMatrix();
    }, { passive: false });

    // ---------------- input: move (keys) ----------------
    var keys = {};
    var moveKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
    window.addEventListener("keydown", function (e) {
      var k = e.key.toLowerCase();
      if (moveKeys.indexOf(k) !== -1) e.preventDefault();
      keys[k] = true;
    });
    window.addEventListener("keyup", function (e) { keys[e.key.toLowerCase()] = false; });

    // ---------------- input: touch dpad ----------------
    var touchMove = { fwd: false, back: false, left: false, right: false };
    document.querySelectorAll("#dpad button").forEach(function (b) {
      var dir = b.dataset.move;
      var on = function (e) { e.preventDefault(); touchMove[dir] = true; };
      var off = function (e) { e.preventDefault(); touchMove[dir] = false; };
      b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off);
      b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
    });

    window.addEventListener("resize", function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
    });

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var clock = new THREE.Clock();

    function movePlayer(dt) {
      var fwd = ((keys["w"] || keys["arrowup"] || touchMove.fwd) ? 1 : 0) - ((keys["s"] || keys["arrowdown"] || touchMove.back) ? 1 : 0);
      var strafe = ((keys["d"] || keys["arrowright"] || touchMove.right) ? 1 : 0) - ((keys["a"] || keys["arrowleft"] || touchMove.left) ? 1 : 0);
      if (!fwd && !strafe) return;
      var speed = 4.2 * dt;
      var fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
      var rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
      var nx = player.x + (fx * fwd + rx * strafe) * speed;
      var nz = player.z + (fz * fwd + rz * strafe) * speed;
      if (allowed(nx, player.z)) player.x = nx;
      if (allowed(player.x, nz)) player.z = nz;
    }

    function idleCat(dt, t) {
      catIdle.blink -= dt;
      var blinking = catIdle.blink < 0.12 && catIdle.blink > 0;
      eyeL.scale.y = eyeR.scale.y = blinking ? 0.02 : 0.12;
      if (catIdle.blink <= 0) catIdle.blink = 2.5 + Math.random() * 3.5;
      catIdle.lick -= dt;
      if (catIdle.lick <= 0 && catIdle.licking <= 0) { catIdle.licking = 2.2; catIdle.lick = 6 + Math.random() * 6; }
      if (catIdle.licking > 0) { catIdle.licking -= dt; pawFL.position.y = 0.1 + Math.max(0, Math.sin((2.2 - catIdle.licking) * 6)) * 0.45; }
      else { pawFL.position.y = 0.1; }
      cat.position.y = Math.sin(t * 1.5) * 0.015;
      tail.rotation.x = Math.sin(t * 2) * 0.35; tail.position.y = 0.55 + Math.sin(t * 2) * 0.05;
    }

    function animate() {
      requestAnimationFrame(animate);
      var dt = Math.min(clock.getDelta(), 0.05);
      var t = clock.elapsedTime;

      movePlayer(dt);

      flames.forEach(function (fl) {
        var wob = Math.sin(t * fl.userData.speed + fl.userData.off);
        fl.position.y = fl.userData.base + wob * 0.12;
        fl.position.x = FIRE.x + Math.sin(t * fl.userData.speed * 0.5 + fl.userData.off) * 0.06;
        var pulse = 0.85 + 0.3 * Math.abs(wob);
        fl.scale.set(fl.userData.sx * pulse, fl.userData.sx * (1.1 + 0.3 * wob), fl.userData.sx * pulse);
      });
      fireLight.intensity = 2.3 + Math.sin(t * 12) * 0.25 + Math.sin(t * 7.3) * 0.2;
      winMats.forEach(function (wm) { wm.color.setHSL(0.11, 0.9, 0.62 + Math.sin(t * 1.5) * 0.04); });
      torchMats.forEach(function (o, k) { o.m.color.setHSL(0.08, 0.95, 0.6 + Math.sin(t * 9 + k) * 0.08); });

      // water shimmer
      water.forEach(function (w) { w.position.y = -0.75 + Math.sin(t * 1.6 + w.userData.off) * 0.05; });

      if (!reduced) idleCat(dt, t);

      var pos = snow.geometry.attributes.position.array;
      for (var j = 0; j < snowCount; j++) {
        pos[j * 3 + 1] -= 0.03 + (j % 5) * 0.004;
        pos[j * 3] += Math.sin(t + j) * 0.004;
        if (pos[j * 3 + 1] < 0) pos[j * 3 + 1] = 26;
      }
      snow.geometry.attributes.position.needsUpdate = true;

      applyCamera();
      renderer.render(scene, camera);
    }

    applyCamera();
    animate();
  })();
