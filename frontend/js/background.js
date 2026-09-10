(function () {
  const PARTICLE_COUNT = 40;
  const HIGHLIGHT_RADIUS = 160;
  const HIGHLIGHT_DURATION = 1;
  const EMIT_MIN_DISTANCE = 12;

  let canvas, ctx, width, height;
  let particles = [];
  let highlights = [];
  let isTouchHolding = false;
  let lastEmitX = null;
  let lastEmitY = null;

  function getColors() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    return isDark
      ? { dot: "#C7C7C7", line: "#FFFFFF" }
      : { dot: "#0a0910", line: "#090909" };
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function randomParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 1.8 + 1.4,
    };
  }

  function emitHighlight(x, y) {
    highlights.push({ x, y, life: HIGHLIGHT_DURATION });
    lastEmitX = x;
    lastEmitY = y;
  }

  function step() {
    ctx.clearRect(0, 0, width, height);
    const colors = getColors();

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = colors.dot;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    highlights = highlights.filter((h) => {
      h.life -= 0.03;
      if (h.life <= 0) return false;

      const nearby = particles.filter(
        (p) => Math.hypot(p.x - h.x, p.y - h.y) < HIGHLIGHT_RADIUS
      );

      nearby.forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = colors.line;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = h.life * 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      for (let i = 0; i < nearby.length; i++) {
        for (let j = i + 1; j < nearby.length; j++) {
          ctx.beginPath();
          ctx.moveTo(nearby[i].x, nearby[i].y);
          ctx.lineTo(nearby[j].x, nearby[j].y);
          ctx.strokeStyle = colors.line;
          ctx.lineWidth = 0.8;
          ctx.globalAlpha = h.life * 0.4;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      ctx.beginPath();
      ctx.arc(h.x, h.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = colors.line;
      ctx.globalAlpha = h.life * 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;

      return true;
    });

    requestAnimationFrame(step);
  }

  function init() {
    canvas = document.createElement("canvas");
    canvas.id = "interactive-bg-canvas";
    document.body.prepend(canvas);
    ctx = canvas.getContext("2d");

    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(randomParticle());
    }

    // Mouse: follow automatically on hover, no click needed.
    document.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;

      if (
        lastEmitX === null ||
        Math.hypot(e.clientX - lastEmitX, e.clientY - lastEmitY) >= EMIT_MIN_DISTANCE
      ) {
        emitHighlight(e.clientX, e.clientY);
      }
    });

    // Touch: needs contact first (no hover state exists on touch).
    document.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      isTouchHolding = true;
      lastEmitX = null;
      lastEmitY = null;
      emitHighlight(e.clientX, e.clientY);
    });

    document.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse" || !isTouchHolding) return;

      if (
        lastEmitX === null ||
        Math.hypot(e.clientX - lastEmitX, e.clientY - lastEmitY) >= EMIT_MIN_DISTANCE
      ) {
        emitHighlight(e.clientX, e.clientY);
      }
    });

    document.addEventListener("pointerup", () => {
      isTouchHolding = false;
    });

    document.addEventListener("pointercancel", () => {
      isTouchHolding = false;
    });

    requestAnimationFrame(step);
  }

  document.addEventListener("DOMContentLoaded", init);
})();