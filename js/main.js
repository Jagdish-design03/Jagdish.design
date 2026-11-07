(function () {
  var doc = document.documentElement;
  doc.classList.remove('no-js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(function () { setTimeout(function () { doc.classList.add('loaded'); }, 60); });

  /* Nav */
  var nav = document.querySelector('.nav'), lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    if (nav) {
      nav.classList.toggle('scrolled', y > 20);
      if (!doc.classList.contains('menu-open')) nav.classList.toggle('hide', y > lastY && y > 500);
    }
    lastY = y;
    if (words.length) paintWords();
  }
  var menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = doc.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* Reveal */
  var els = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    els.forEach(function (el) { io.observe(el); });
  } else { els.forEach(function (el) { el.classList.add('in'); }); }

  /* Statement: words light up as you scroll */
  var words = [];
  var st = document.querySelector('.statement');
  if (st) {
    var hl = (st.getAttribute('data-hl') || '').split('|');
    var html = '';
    st.textContent.trim().split(/\s+/).forEach(function (w) {
      var isHl = hl.some(function (h) { return h && w.toLowerCase().indexOf(h.toLowerCase()) === 0; });
      html += '<span class="w' + (isHl ? ' hl' : '') + '">' + w + '</span> ';
    });
    st.innerHTML = html;
    words = st.querySelectorAll('.w');
    if (reduce) words.forEach(function (w) { w.classList.add('on'); });
  }
  function paintWords() {
    if (reduce) return;
    var r = st.getBoundingClientRect(), vh = window.innerHeight;
    var p = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
    p = Math.max(0, Math.min(1, p));
    var n = Math.round(p * words.length);
    words.forEach(function (w, i) { w.classList.toggle('on', i < n); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Case wheel */
  var wheel = document.querySelector('.wheel');
  if (wheel) {
    var cards = [].slice.call(wheel.querySelectorAll('.wcard'));
    var tabs = [].slice.call(document.querySelectorAll('.tab'));
    var n = cards.length, cur = 0, prev = cards.map(function (_, k) { return k; });
    var timer = null;
    function set(i, user) {
      cur = ((i % n) + n) % n;
      cards.forEach(function (c, k) {
        var d = k - cur;
        if (d > n / 2) d -= n;
        if (d <= -n / 2) d += n;
        if (Math.abs(d - prev[k]) > 1) {           // wrapped: jump without spinning across
          c.style.transition = 'none';
          c.style.setProperty('--d', d);
          void c.offsetWidth;
          c.style.transition = '';
        } else {
          c.style.setProperty('--d', d);
        }
        prev[k] = d;
        c.classList.toggle('on', d === 0);
        c.classList.toggle('off', Math.abs(d) > 2);
        c.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
        var a = c.querySelector('.wc-a'); if (a) a.tabIndex = d === 0 ? 0 : -1;
      });
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === cur ? 'true' : 'false'); });
      var at = tabs[cur], row = document.querySelector('.tabs-row');
      if (at && row && row.scrollWidth > row.clientWidth) row.scrollTo({ left: at.offsetLeft - 40, behavior: reduce ? 'auto' : 'smooth' });
      if (user) stop();
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    tabs.forEach(function (t, k) { t.addEventListener('click', function () { set(k, true); }); });
    cards.forEach(function (c, k) { c.addEventListener('click', function () { if (!c.classList.contains('on')) set(k, true); }); });
    document.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { set(cur + Number(b.getAttribute('data-go')), true); });
    });
    wheel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); set(cur + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); set(cur - 1, true); }
    });
    var sx = null;
    wheel.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    wheel.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) set(cur + (dx < 0 ? 1 : -1), true);
      sx = null;
    });
    set(0);
    // gentle autoplay until the visitor interacts
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && timer === null && !wheel.dataset.touched) timer = setInterval(function () { set(cur + 1); }, 4500);
          if (!e.isIntersecting) stop();
        });
      }, { threshold: 0.4 }).observe(wheel);
      ['pointerdown', 'mouseenter', 'focusin'].forEach(function (ev) {
        wheel.addEventListener(ev, function () { wheel.dataset.touched = '1'; stop(); });
        document.querySelector('.tabs-row').addEventListener(ev, function () { wheel.dataset.touched = '1'; stop(); });
      });
    }
  }

  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
