/* =========================
 * main.js — fixed & hardened
 * =========================
 * - Safe guards for missing elements / Bootstrap
 * - No duplicate listeners for the same sections
 * - Performance-friendly IntersectionObservers
 * - Defensive math for scroll progress
 */

// ========== Scroll progress (defensive) ==========
(function () {
  function onScroll() {
    const el = document.getElementById('scrollProgress');
    if (!el) return;
    const h = document.documentElement;
    const denom = Math.max(1, h.scrollHeight - h.clientHeight); // avoid 0
    const p = Math.min(1, Math.max(0, h.scrollTop / denom));
    el.style.transform = `scaleX(${p})`;
  }
  // first paint + on scroll
  onScroll();
  document.addEventListener('scroll', onScroll, { passive: true });
})();

// ========== DOM Ready bootstrapping ==========
document.addEventListener('DOMContentLoaded', () => {
  const hasBootstrap = typeof window.bootstrap !== 'undefined';

  // ------ Offcanvas toggle (guarded) ------
  (function () {
    const toggle = document.querySelector('.nav-toggle');
    const offcanvasEl = document.getElementById('offcanvasNav');
    if (!toggle || !offcanvasEl) return;
    if (!hasBootstrap || !bootstrap?.Offcanvas) {
      // Fallback: just toggle a class to avoid errors
      toggle.addEventListener('click', () => {
        offcanvasEl.classList.toggle('show');
        toggle.classList.toggle('is-open');
      });
      offcanvasEl.querySelectorAll('.nav-link')?.forEach(a => {
        a.addEventListener('click', () => {
          offcanvasEl.classList.remove('show');
          toggle.classList.remove('is-open');
        });
      });
      return;
    }
    const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
    offcanvasEl.addEventListener('show.bs.offcanvas', () => toggle.classList.add('is-open'));
    offcanvasEl.addEventListener('hide.bs.offcanvas', () => toggle.classList.remove('is-open'));
    offcanvasEl.querySelectorAll('.nav-link')?.forEach(a => {
      a.addEventListener('click', () => bsOffcanvas.hide());
    });
  })();

  // ------ Active nav link on scroll (guarded) ------
  (function () {
    const allLinks = Array.from(document.querySelectorAll('.main-links .nav-link, #mainNavList .nav-link'));
    if (!allLinks.length || !('IntersectionObserver' in window)) return;
    const sections = [];
    allLinks.forEach(a => {
      if (a.hash) {
        const sec = document.querySelector(a.hash);
        if (sec) sections.push({ link: a, sec });
      }
    });
    if (!sections.length) return;

    // ensure we observe each section once
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const id = e.target.id;
        allLinks.forEach(l => l.classList.remove('active'));
        const active = allLinks.find(l => l.getAttribute('href') === `#${id}`);
        if (active) active.classList.add('active');
      });
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

    sections.forEach(({ sec }) => io.observe(sec));
  })();

  // ------ Typing effect (stable width) ------
  (function () {
    const el = document.getElementById('typeTarget');
    if (!el) return;
    let list = [];
    try {
      list = JSON.parse(el.getAttribute('data-strings') || '[]');
    } catch (_) { list = []; }
    if (!Array.isArray(list) || !list.length) return;

    // Stabilize width to prevent layout jitter while typing
    try {
      const measure = document.createElement('span');
      measure.style.cssText = 'visibility:hidden;position:absolute;white-space:nowrap;font:inherit;';
      document.body.appendChild(measure);
      let maxW = 0;
      for (const s of list) {
        measure.textContent = s;
        const w = measure.getBoundingClientRect().width;
        if (w > maxW) maxW = w;
      }
      document.body.removeChild(measure);
      el.style.display = 'inline-block';
      el.style.whiteSpace = 'nowrap';
      if (maxW) el.style.minWidth = Math.ceil(maxW) + 'px';
    } catch (_) { /* no-op */ }

    let i = 0, j = 0, dir = 1, destroyed = false;
    const typeDelay = 55, eraseDelay = 35, holdFull = 1200, holdEmpty = 260;

    function tick() {
      if (destroyed) return;
      const txt = list[i];
      el.textContent = txt.slice(0, j);

      if (dir === 1 && j === txt.length) { dir = -1; return setTimeout(tick, holdFull); }
      if (dir === -1 && j === 0) { dir = 1; i = (i + 1) % list.length; return setTimeout(tick, holdEmpty); }

      j += dir;
      setTimeout(tick, dir === 1 ? typeDelay : eraseDelay);
    }
    tick();

    // cleanup if DOM node is removed
    const mo = new MutationObserver(() => {
      if (!document.body.contains(el)) { destroyed = true; mo.disconnect(); }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  })();

  // ------ Counter up when visible ------
  (function () {
    const nums = document.querySelectorAll('#stats .num[data-count]');
    if (!nums.length || !('IntersectionObserver' in window)) return;
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.dataset.counted) { io.unobserve(el); return; }

        el.dataset.counted = '1';
        const to = parseInt(el.dataset.count, 10) || 0;
        const from = parseInt((el.textContent || '0').replace(/\D/g, ''), 10) || 0;
        const dur = 1200;
        const start = performance.now();

        function step(now) {
          const t = Math.min(1, (now - start) / dur);
          const val = Math.round(from + (to - from) * easeOutCubic(t));
          el.textContent = String(val);
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });

    nums.forEach(n => io.observe(n));
  })();

  // ------ Reveal + Tilt helpers (single-instance) ------
  (function () {
    const isCoarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;

    const revealOnce = (selector, animation) => {
      const targets = document.querySelectorAll(selector);
      if (!targets.length || !('IntersectionObserver' in window)) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const t = e.target;
          if (t.dataset.revealed) { io.unobserve(t); return; }
          t.dataset.revealed = '1';
          if (animation === 'fadeUp') {
            t.style.willChange = 'opacity, transform';
            t.animate(
              [{ opacity: 0, transform: 'translateY(10px) scale(.985)' }, { opacity: 1, transform: 'none' }],
              { duration: 520, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'forwards' }
            );
          } else {
            // simple class toggle
            t.classList.add('in');
          }
          io.unobserve(t);
        });
      }, { threshold: 0.35 });
      targets.forEach(c => io.observe(c));
    };

    const addTilt = (selector) => {
      if (isCoarse) return; // disable on touch
      const els = document.querySelectorAll(selector);
      if (!els.length) return;
      const clamp = (n, min, max) => Math.max(min, Math.min(n, max));
      els.forEach(el => {
        let rx = 0, ry = 0, raf;
        const onMove = (e) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;   // 0..1
          const y = (e.clientY - r.top) / r.height;   // 0..1
          rx = clamp((.5 - y) * 6, -6, 6);
          ry = clamp((x - .5) * 6, -6, 6);
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            el.style.transform = `translateY(-3px) rotateX(${rx}deg) rotateY(${ry}deg)`;
          });
        };
        const reset = () => { el.style.transform = ''; };
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', reset);
        el.addEventListener('blur', reset);
      });
    };

    // Apply reveal/tilt (no duplicates)
    revealOnce('.hero-card[data-animate]', 'class');  // adds .in
    revealOnce('#content .reveal', 'class');
    addTilt('#content .tilt');

    revealOnce('#content3 .cert-card', 'fadeUp');
    addTilt('#content3 .cert-card');

    revealOnce('#content2 .t-card', 'fadeUp');
    addTilt('#content2 .t-card');

    revealOnce('#testimonials .testi-card, #contact .contact-card', 'class');
  })();
});

