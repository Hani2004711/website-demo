(() => {
    'use strict';
  
    /* ========= Utilities ========= */
    const $  = (s, r=document) => r.querySelector(s);
    const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
    const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
  
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasFinePointer       = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  
    // RAF throttle helper
    const rafThrottle = (fn) => {
      let ticking = false;
      return (...args) => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { fn(...args); ticking = false; });
      };
    };
  
    // Parse phrases from data-attributes (JSON, | أو ,)
    const parsePhrases = (el, fallback=[]) => {
      const raw = el?.dataset?.phrases;
      if (!raw) return fallback;
      try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) && arr.length ? arr : fallback;
      } catch {
        const arr = raw.split(/[\|,]/).map(s => s.trim()).filter(Boolean);
        return arr.length ? arr : fallback;
      }
    };
  
    document.addEventListener('DOMContentLoaded', () => {
  
      /* ========= Footer year ========= */
      const y = $('#y');
      if (y) y.textContent = new Date().getFullYear();
  
      /* ========= AOS (إن وُجد) ========= */
      if (window.AOS && !prefersReducedMotion) {
        AOS.init({ once:true, duration:700, offset:80 });
      }
  
      /* ========= Typewriter ========= */
      (() => {
        const el = $('#typeTarget');
        if (!el) return;
  
        const phrases = parsePhrases(el, [
          'مطور تطبيقات Flutter',
          'واجهات ويب حديثة (Front-End)',
          'تصميم قواعد بيانات MySQL',
          'تكامل Firebase وواجهات APIs',
          'أساسيات أمن المعلومات وRed Teaming'
        ]);
  
        // سرعات قابلة للتخصيص عبر data-*
        const speed       = Number(el.dataset.speed)       || 85;
        const backSpeed   = Number(el.dataset.backSpeed)   || 40;
        const pauseEnd    = Number(el.dataset.pauseEnd)    || 1100;
        const pauseStart  = Number(el.dataset.pauseStart)  || 300;
  
        if (prefersReducedMotion) { el.textContent = phrases[0] || ''; return; }
  
        let i=0, idx=0, del=false, tId=null, paused=false;
  
        const type = () => {
          if (paused) return;
          const full = phrases[i];
          el.textContent = del ? full.slice(0, --idx) : full.slice(0, ++idx);
          let delay = del ? backSpeed : speed;
  
          if (!del && idx === full.length) { del = true;  delay = pauseEnd;  }
          else if (del && idx === 0)       { del = false; i = (i+1) % phrases.length; delay = pauseStart; }
  
          tId = setTimeout(type, delay);
        };
  
        // أوقف/استأنف عند ظهور/اختفاء العنصر
        if ('IntersectionObserver' in window) {
          const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
              if (e.isIntersecting) {
                paused = false;
                clearTimeout(tId);
                tId = setTimeout(type, 100);
              } else {
                paused = true;
                clearTimeout(tId);
              }
            });
          }, { threshold: .1 });
          io.observe(el);
        } else {
          type();
        }
  
        // أمان عند تغيير التبويب
        on(document, 'visibilitychange', () => {
          if (document.hidden) { paused = true; clearTimeout(tId); }
          else { paused = false; clearTimeout(tId); tId = setTimeout(type, 120); }
        });
      })();
  
      /* ========= Navbar shadow + Scroll progress ========= */
      (() => {
        const nav = $('#mainNav');
        if (!nav) return;
  
        let bar = $('#scrollProgress');
        if (!bar) {
          bar = document.createElement('div');
          bar.id = 'scrollProgress';
          nav.appendChild(bar);
        }
  
        const updateProgress = () => {
          const sTop = window.scrollY || document.documentElement.scrollTop;
          const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          const ratio = (sTop / docH) * 100;
          bar.style.width = ratio.toFixed(2) + '%';
          nav.classList.toggle('is-scrolled', sTop > 8);
        };
  
        const onScroll = rafThrottle(updateProgress);
        updateProgress();
        on(window, 'scroll', onScroll, { passive:true });
        on(window, 'resize', onScroll);
      })();
  
      /* ========= Bootstrap ScrollSpy (اختياري) ========= */
      (() => {
        if (!window.bootstrap) return;
        new bootstrap.ScrollSpy(document.body, { target:'#mainNav', offset:90 });
      })();
  
      /* ========= Active link + Ink underline + Ripple ========= */
      (() => {
        const nav  = $('#mainNav');
        if (!nav) return;
        const list = $('#mainNav .navbar-nav') || $('#mainNavList') || nav;
        const links = $$('#mainNav .nav-link');
  
        // حبر متحرك
        let ink = $('.nav-ink', list);
        if (!ink) {
          ink = document.createElement('span');
          ink.className = 'nav-ink';
          list.style.position = 'relative';
          list.appendChild(ink);
        }
  
        const moveInkTo = (el) => {
          if (!ink || !el) return;
          const pr = list.getBoundingClientRect();
          const r  = el.getBoundingClientRect();
          const width = Math.max(0, r.width - 14);
          const x = (r.left - pr.left) + 7; // يعمل RTL/LTR
          ink.style.width = width + 'px';
          ink.style.transform = `translateX(${x}px)`;
        };
  
        const currentActive = () =>
          $('#mainNav .nav-link.active') || $('#mainNav .nav-link[href="#home"]') || links[0];
  
        // Ripple على الأجهزة المناسبة فقط
        if (hasFinePointer && !prefersReducedMotion) {
          links.forEach(a => {
            on(a, 'click', (e) => {
              const r = document.createElement('span');
              r.className = 'ripple';
              const rect = a.getBoundingClientRect();
              r.style.left = (e.clientX - rect.left) + 'px';
              r.style.top  = (e.clientY - rect.top)  + 'px';
              a.appendChild(r);
              r.addEventListener('animationend', () => r.remove());
            });
          });
        }
  
        links.forEach(a => {
          on(a, 'mouseenter', () => moveInkTo(a));
          on(a, 'focus',      () => moveInkTo(a));
        });
  
        // تفعيل احتياطي باستخدام IO
        const sectionIds = links.map(a => a.getAttribute('href')).filter(h => h && h.startsWith('#'));
        const sections   = sectionIds.map(id => document.querySelector(id)).filter(Boolean);
        const activate = (id) => {
          links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
          if (window.innerWidth >= 992) moveInkTo(currentActive());
        };
  
        if ('IntersectionObserver' in window && sections.length) {
          const io = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) activate('#' + e.target.id); });
          }, { rootMargin:'-40% 0px -55% 0px', threshold:[0, .6] });
          sections.forEach(sec => io.observe(sec));
        }
  
        on(window, 'resize', () => moveInkTo(currentActive()));
  
        // Offcanvas: اغلاق بعد الضغط + استعادة الحبر
        const offcanvasEl = $('#offcanvasNav');
        if (offcanvasEl && window.bootstrap) {
          const off = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
          $$('#offcanvasNav .nav-link').forEach(a => on(a, 'click', () => off.hide()));
          on(offcanvasEl, 'show.bs.offcanvas', () => { if (ink) ink.style.width = '0px'; });
          on(offcanvasEl, 'hidden.bs.offcanvas', () => moveInkTo(currentActive()));
        }
  
        moveInkTo(currentActive());
      })();
  
      /* ========= Projects filter (سلس وبدون فليكر) ========= */
      (() => {
        const btns  = $$('[data-filter]');
        const cards = $$('#projects .project-card');
        if (!btns.length || !cards.length) return;
  
        // تحضير انتقالات مرة واحدة
        cards.forEach(col => {
          const c = $('.card', col) || col;
          c.style.transition = 'opacity .22s ease, transform .22s ease, filter .22s ease';
        });
  
        btns.forEach(btn => on(btn, 'click', () => {
          btns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
  
          const f = btn.dataset.filter;
          cards.forEach(col => {
            const match = (f === 'all' || col.dataset.cat === f);
            const c = $('.card', col) || col;
  
            if (match) {
              col.style.display = '';
              col.setAttribute('aria-hidden', 'false');
              requestAnimationFrame(() => {
                c.style.opacity = '1';
                c.style.transform = 'none';
                c.style.filter = 'none';
              });
            } else {
              c.style.opacity = '0';
              c.style.transform = 'scale(.98)';
              c.style.filter = 'blur(.3px)';
              col.setAttribute('aria-hidden', 'true');
              setTimeout(() => { col.style.display = 'none'; }, 220);
            }
          });
        }));
      })();
  
      /* ========= Metrics count-up ========= */
      (() => {
        const nums = $$('.metrics .num');
        if (!nums.length || prefersReducedMotion) return;
  
        const obs = new IntersectionObserver((entries, o) => {
          entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target;
            const target = +el.dataset.count || 0;
            let cur = 0;
            const step = Math.max(1, Math.ceil(target / 70));
            (function inc(){
              cur += step;
              if (cur >= target) el.textContent = target;
              else { el.textContent = cur; requestAnimationFrame(inc); }
            })();
            o.unobserve(el);
          });
        }, { threshold: .6 });
  
        nums.forEach(n => obs.observe(n));
      })();
  
      /* ========= Tilt (أجهزة المؤشر الدقيق فقط) ========= */
      (() => {
        if (!hasFinePointer || prefersReducedMotion) return;
        const tiltEls = $$('.tilt');
        if (!tiltEls.length) return;
  
        const R = 15;
        tiltEls.forEach(card => {
          card.style.transformStyle = 'preserve-3d';
          let rafId = 0, rx = 0, ry = 0, trX = 0, trY = 0;
  
          const render = () => {
            card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translate(${trX}px, ${trY}px)`;
            rafId = 0;
          };
  
          on(card, 'mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top)  / rect.height;
            rx = (y - .5) * -R;
            ry = (x - .5) *  R;
            if (!rafId) rafId = requestAnimationFrame(render);
          });
  
          on(card, 'mouseleave', () => {
            rx = ry = trX = trY = 0;
            if (!rafId) rafId = requestAnimationFrame(render);
          });
        });
      })();
  
      /* ========= Stats hover parallax (desktop) ========= */
      (() => {
        if (!hasFinePointer || prefersReducedMotion) return;
        const stats = $$('#stats .card');
        stats.forEach(card => {
          let rafId = 0, tx = 0, ty = 0;
          const render = () => { card.style.transform = `translate(${tx}px, ${ty}px)`; rafId = 0; };
          on(card, 'mousemove', (e) => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left)/r.width - .5;
            const y = (e.clientY - r.top) /r.height - .5;
            tx = +(x*6).toFixed(1); ty = +(y*4).toFixed(1);
            if (!rafId) rafId = requestAnimationFrame(render);
          });
          on(card, 'mouseleave', () => { tx = ty = 0; if (!rafId) rafId = requestAnimationFrame(render); });
        });
      })();
  
      /* ========= Contact form (بدون inline) ========= */
      (() => {
        const form = $('#contactForm');
        if (!form) return;
        on(form, 'submit', (e) => {
          e.preventDefault();
          const name = form.querySelector('[name="name"]')?.value?.trim() || '';
          alert(`تم استلام رسالتك${name ? ' يا ' + name : ''} ✅`);
          form.reset();
        });
      })();
  
    }); // DOMContentLoaded
  })();
  