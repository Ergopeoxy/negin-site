/* ==========================================================================
   Point-cloud background
   A cloud of points arranged on the surface of geometric shapes (sphere,
   cube, torus, pyramid). The cloud slowly rotates, morphs between shapes,
   and points are repelled by the user's cursor — like poking a live scan.

   Tuning knobs are collected in CONFIG below.
   ========================================================================== */
(function () {
  "use strict";

  const canvas = document.getElementById("pointcloud");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 760px)").matches;

  const CONFIG = {
    pointCount: isMobile ? 350 : 750,
    shapeRadius: 210,          // base size of the shapes (world units)
    rotationSpeed: 0.0016,     // radians per frame around Y
    wobbleSpeed: 0.0007,       // radians per frame around X
    morphEvery: 9000,          // ms between shape changes
    morphLerp: 0.045,          // how fast points travel to their new shape
    mouseRadius: 130,          // px — influence radius of the cursor
    mouseForce: 34,            // px — max displacement at the cursor center
    perspective: 640,          // camera focal length
    baseAlpha: 0.75,
    colorNear: [63, 224, 230],   // cyan for points close to camera
    colorFar: [157, 107, 255],   // violet for points far away
  };

  // ------------------------------------------------------------ shape math
  // Each generator returns {x, y, z} on the surface of a shape, i in [0, 1).
  function sphere(i, n) {
    // Fibonacci sphere — evenly distributed points
    const golden = Math.PI * (3 - Math.sqrt(5));
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    return scale(Math.cos(theta) * r, y, Math.sin(theta) * r);
  }

  function cube(i, n) {
    // Random point on a random face of a cube
    const face = Math.floor(rand(i) * 6);
    const u = rand(i + 1) * 2 - 1;
    const v = rand(i + 2) * 2 - 1;
    const faces = [
      [u, v, 1], [u, v, -1],
      [u, 1, v], [u, -1, v],
      [1, u, v], [-1, u, v],
    ];
    const p = faces[face];
    return scale(p[0] * 0.78, p[1] * 0.78, p[2] * 0.78);
  }

  function torus(i, n) {
    const R = 0.72, r = 0.3;
    const a = rand(i) * Math.PI * 2;
    const b = rand(i + 3) * Math.PI * 2;
    return scale(
      (R + r * Math.cos(b)) * Math.cos(a),
      r * Math.sin(b),
      (R + r * Math.cos(b)) * Math.sin(a)
    );
  }

  function pyramid(i, n) {
    // Point on the surface of a 4-sided pyramid (tetrahedron-ish landmark)
    const apex = [0, 1, 0];
    const base = [
      [-1, -0.8, -1], [1, -0.8, -1], [1, -0.8, 1], [-1, -0.8, 1],
    ];
    const face = Math.floor(rand(i) * 5);
    let u = rand(i + 1), v = rand(i + 2);
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    let p;
    if (face === 4) {
      // base quad
      p = [
        -1 + rand(i + 1) * 2,
        -0.8,
        -1 + rand(i + 2) * 2,
      ];
    } else {
      const a = base[face], b = base[(face + 1) % 4];
      p = [
        apex[0] + (a[0] - apex[0]) * u + (b[0] - apex[0]) * v,
        apex[1] + (a[1] - apex[1]) * u + (b[1] - apex[1]) * v,
        apex[2] + (a[2] - apex[2]) * u + (b[2] - apex[2]) * v,
      ];
    }
    return scale(p[0] * 0.8, p[1] * 0.8, p[2] * 0.8);
  }

  function scale(x, y, z) {
    const s = CONFIG.shapeRadius;
    return { x: x * s, y: y * s, z: z * s };
  }

  // Deterministic pseudo-random so each point keeps a stable spot per shape
  function rand(seed) {
    const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  const SHAPES = [sphere, torus, cube, pyramid];

  // -------------------------------------------------------------- state
  let width, height, cx, cy;
  const points = [];
  let shapeIndex = 0;
  let angleY = 0, angleX = 0;
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = width / 2;
    cy = height * 0.46; // cloud sits slightly above center, behind the hero
  }

  function init() {
    resize();
    const n = CONFIG.pointCount;
    for (let i = 0; i < n; i++) {
      const target = SHAPES[0](i, n);
      points.push({
        x: target.x, y: target.y, z: target.z,   // current position
        tx: target.x, ty: target.y, tz: target.z, // morph target
        ox: 0, oy: 0,                             // screen-space mouse offset
      });
    }
  }

  function setShape(index) {
    const n = points.length;
    const gen = SHAPES[index % SHAPES.length];
    for (let i = 0; i < n; i++) {
      const t = gen(i, n);
      points[i].tx = t.x;
      points[i].ty = t.y;
      points[i].tz = t.z;
    }
  }

  // ------------------------------------------------------------- render
  function frame() {
    ctx.clearRect(0, 0, width, height);

    angleY += CONFIG.rotationSpeed;
    angleX += CONFIG.wobbleSpeed;
    const sinY = Math.sin(angleY), cosY = Math.cos(angleY);
    const sinX = Math.sin(angleX) * 0.35, cosX = Math.cos(angleX * 0.5);

    for (const p of points) {
      // morph toward the current shape
      p.x += (p.tx - p.x) * CONFIG.morphLerp;
      p.y += (p.ty - p.y) * CONFIG.morphLerp;
      p.z += (p.tz - p.z) * CONFIG.morphLerp;

      // rotate around Y then a gentle X wobble
      let x = p.x * cosY - p.z * sinY;
      let z = p.x * sinY + p.z * cosY;
      let y = p.y * cosX - z * sinX * 0.4;
      z = z * cosX + p.y * sinX * 0.4;

      // perspective projection
      const depth = CONFIG.perspective / (CONFIG.perspective + z);
      let sx = cx + x * depth;
      let sy = cy + y * depth;

      // mouse repulsion (screen space, eased)
      const dx = sx - mouse.x;
      const dy = sy - mouse.y;
      const dist = Math.hypot(dx, dy);
      let pushX = 0, pushY = 0;
      if (dist < CONFIG.mouseRadius && dist > 0.01) {
        const force = (1 - dist / CONFIG.mouseRadius) * CONFIG.mouseForce;
        pushX = (dx / dist) * force;
        pushY = (dy / dist) * force;
      }
      p.ox += (pushX - p.ox) * 0.14;
      p.oy += (pushY - p.oy) * 0.14;
      sx += p.ox;
      sy += p.oy;

      // depth-based color and size
      const t = Math.min(Math.max((depth - 0.7) / 0.6, 0), 1);
      const c0 = CONFIG.colorFar, c1 = CONFIG.colorNear;
      const r = (c0[0] + (c1[0] - c0[0]) * t) | 0;
      const g = (c0[1] + (c1[1] - c0[1]) * t) | 0;
      const b = (c0[2] + (c1[2] - c0[2]) * t) | 0;
      const size = 0.9 + depth * 1.3;
      const disturbed = Math.min(Math.hypot(p.ox, p.oy) / CONFIG.mouseForce, 1);
      const alpha = CONFIG.baseAlpha * (0.35 + t * 0.65) + disturbed * 0.25;

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
    }
  }

  // --------------------------------------------------------------- loop
  let running = true;

  function loop() {
    if (running) frame();
    requestAnimationFrame(loop);
  }

  init();

  if (reducedMotion) {
    // Static render: one calm frame, no rotation, morphing, or mouse reaction.
    frame();
  } else {
    window.addEventListener("pointermove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    window.addEventListener("pointerleave", () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });
    setInterval(() => {
      shapeIndex = (shapeIndex + 1) % SHAPES.length;
      setShape(shapeIndex);
    }, CONFIG.morphEvery);
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
    });
    loop();
  }

  window.addEventListener("resize", () => {
    resize();
    if (reducedMotion) frame();
  });
})();
