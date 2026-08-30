/* ---------- Scroll reveal (subtle, site-wide) ----------
   Targets are assigned here rather than in the HTML so every page
   gets it for free. Elements that are ancestors of a `position:sticky`
   child (.case-section, .case-grid, .work) are deliberately excluded —
   a transform on an ancestor breaks sticky positioning. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  const SELECTORS = [
    // shared case-study pieces
    '.case-hero-title', '.case-hero-tagline', '.case-meta > div',
    '.case-block', '.case-shot', '.case-tag', '.case-quote',
    '.icon-card', '.stat-card', '.challenge-card', '.finding-card',
    '.highlight-card', '.impact-stat', '.numbered-card', '.compare-table',
    '.note-card', '.flow-step', '.testimonial-card', '.compare-row',
    // MAR
    '.mar-eyebrow', '.mar-h1', '.mar-statement', '.mar-objective .mar-media',
    '.mar-timeline > li', '.mar-row', '.mar-photo-row .mar-media',
    '.mar-strip li', '.mar-type-col', '.mar-aa', '.mar-swatch',
    '.mar-screen', '.mar-media--showcase', '.mar-thanks',
    // home
    '.section-heading', '.work-list li', '.focus-item',
    '.journey-text > p', '.journey-media', '.cta-card', '.site-footer'
  ];

  const nodes = document.querySelectorAll(SELECTORS.join(','));
  if (!nodes.length) return;

  document.documentElement.classList.add('has-reveal');

  // Stagger siblings so groups cascade instead of popping in together
  const seen = new Map();
  nodes.forEach(el => {
    el.setAttribute('data-reveal', '');
    const parent = el.parentElement;
    const i = seen.get(parent) || 0;
    seen.set(parent, i + 1);
    if (i > 0) el.style.setProperty('--reveal-delay', `${Math.min(i, 5) * 70}ms`);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  nodes.forEach(el => io.observe(el));

  /* Redundant, geometry-based path.
     IntersectionObserver and requestAnimationFrame do not fire in a
     background/throttled tab — without this, content could stay hidden
     forever. Plain timers and scroll events always fire, so they drive
     a second, independent reveal path. */
  const revealInView = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    nodes.forEach(el => {
      if (el.classList.contains('is-in')) return;
      const b = el.getBoundingClientRect();
      if (b.top < vh * 0.95 && b.bottom > 0) el.classList.add('is-in');
    });
  };

  let throttled = false;
  const onScroll = () => {
    if (throttled) return;
    throttled = true;
    setTimeout(() => { throttled = false; revealInView(); }, 100);
  };

  revealInView();                 // anything already on screen, immediately
  setTimeout(revealInView, 200);  // again once late images have laid out
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('load', revealInView);
  document.addEventListener('visibilitychange', revealInView);

  /* Absolute failsafe: if nothing ever revealed, drop the effect entirely
     rather than risk showing a blank page. */
  setTimeout(() => {
    if (!document.querySelector('[data-reveal].is-in')) {
      document.documentElement.classList.remove('has-reveal');
    }
  }, 2500);
})();

const navToggle = document.getElementById('navToggle');
const navRight = document.getElementById('navRight');

navToggle.addEventListener('click', () => {
  const isOpen = navRight.classList.toggle('open');
  navToggle.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('#navRight a').forEach(link => {
  link.addEventListener('click', () => {
    navRight.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

/* ---------- Hero typewriter ---------- */
const typedWordEl = document.getElementById('typedWord');
const heroHeadingEl = document.getElementById('heroHeading');

if (typedWordEl && heroHeadingEl) {
  const words = ['AI.', 'research.', 'data.', 'speed.'];
  const prefixText = heroHeadingEl.querySelector('.dim').textContent;

  const lockHeadingWidth = () => {
    const clone = heroHeadingEl.cloneNode(false);
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.width = 'auto';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    document.body.appendChild(clone);

    let max = 0;
    words.forEach(word => {
      clone.innerHTML = `<span class="dim">${prefixText}</span><span class="bright">${word}</span><span class="type-cursor"></span>`;
      max = Math.max(max, clone.getBoundingClientRect().width);
    });

    document.body.removeChild(clone);
    heroHeadingEl.style.width = `${Math.ceil(max)}px`;
  };

  lockHeadingWidth();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(lockHeadingWidth, 150);
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    typedWordEl.textContent = words[1];
  } else {
    const TYPE_SPEED = 85;
    const DELETE_SPEED = 45;
    const HOLD_TIME = 1400;
    const NEXT_DELAY = 350;
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const tick = () => {
      const current = words[wordIndex];

      if (!deleting) {
        charIndex++;
        typedWordEl.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, HOLD_TIME);
          return;
        }
        setTimeout(tick, TYPE_SPEED);
      } else {
        charIndex--;
        typedWordEl.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
          setTimeout(tick, NEXT_DELAY);
          return;
        }
        setTimeout(tick, DELETE_SPEED);
      }
    };

    tick();
  }
}

/* ---------- Selected Work: sticky scroll card reveal ---------- */
const workSection = document.querySelector('.work');
const workCards = document.querySelectorAll('.work-card-stack .work-card');
const workListItems = document.querySelectorAll('#workList li');

if (workSection && workCards.length) {
  let ticking = false;

  const updateWork = () => {
    ticking = false;
    const rect = workSection.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 0.999) : 0;
    const stage = Math.floor(progress * workCards.length);

    workCards.forEach((card, i) => card.classList.toggle('active', i === stage));
    workListItems.forEach((li, i) => li.classList.toggle('active', i === stage));
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateWork);
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener('resize', updateWork);
  updateWork();
}

/* ---------- Journey: scroll-linked timeline progress ---------- */
const timelineProgress = document.getElementById('timelineProgress');
const timelineContainer = document.querySelector('.journey-grid');
const timelineDots = document.querySelectorAll('.timeline-dot');
const timelineHeadings = document.querySelectorAll('[data-timeline-heading]');

const timelineLine = document.querySelector('.timeline-line');

const positionTimelineDots = () => {
  if (!timelineContainer) return;
  const containerTop = timelineContainer.getBoundingClientRect().top;
  const offsets = [];
  let lastBlockBottom = 0;

  timelineHeadings.forEach(heading => {
    const idx = heading.dataset.timelineHeading;
    const dot = document.querySelector(`.timeline-dot[data-dot="${idx}"]`);
    if (!dot) return;
    const headingRect = heading.getBoundingClientRect();
    const offset = (headingRect.top - containerTop) + headingRect.height / 2;
    dot.style.top = `${offset}px`;
    offsets.push(offset);

    const block = heading.closest('.journey-text');
    if (block) {
      const blockRect = block.getBoundingClientRect();
      const blockBottom = (blockRect.top - containerTop) + blockRect.height;
      lastBlockBottom = Math.max(lastBlockBottom, blockBottom);
    }
  });

  if (offsets.length && timelineLine && timelineProgress) {
    const first = Math.min(...offsets);
    const last = Math.max(lastBlockBottom, Math.max(...offsets));
    [timelineLine, timelineProgress].forEach(el => {
      el.style.top = `${first}px`;
      el.style.bottom = 'auto';
      el.style.height = `${last - first}px`;
    });
  }
};

if (timelineProgress && timelineContainer) {
  let tlTicking = false;

  const updateTimeline = () => {
    tlTicking = false;
    const rect = timelineContainer.getBoundingClientRect();
    const total = rect.height + window.innerHeight;
    const scrolled = window.innerHeight - rect.top;
    const progress = Math.min(Math.max(scrolled / total, 0), 1);
    timelineProgress.style.transform = `translateX(-50%) scaleY(${progress})`;
  };

  window.addEventListener('scroll', () => {
    if (!tlTicking) {
      requestAnimationFrame(updateTimeline);
      tlTicking = true;
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    updateTimeline();
    positionTimelineDots();
  });

  updateTimeline();
  positionTimelineDots();
  // Fonts/images loading can shift heading positions after first paint
  window.addEventListener('load', positionTimelineDots);
}
