/* SVG backdrop displacement is currently rendered in Chromium-family engines.
   Other browsers use a frosted blur fallback; native Apple Liquid Glass isn't
   exposed as a web CSS property. */
if (/\b(?:HeadlessChrome|Chrome|Chromium|Edg)\//.test(navigator.userAgent) &&
    CSS.supports('backdrop-filter','url(#lens-circle) blur(2px)')) {
  document.documentElement.classList.add('optical-refraction');
}

(() => {
  const siteHeader = document.querySelector('.site-header');
  const navLinks = document.querySelector('.nav-links');
  const allNavLinks = [...document.querySelectorAll('.nav-link')];
  const navSlider = navLinks.querySelector('.nav-slider');
  const journeyTabList = document.querySelector('.journey-tabs');
  const journeySlider = journeyTabList.querySelector('.journey-slider');
  const journeyPanels = document.querySelector('.journey-panels');
  const tabs = [...document.querySelectorAll('.journey-tab')];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const trackedSections = ['home', 'about', 'work', 'leadership', 'certifications']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  let scrollingToNav = null;
  let navigationUnlockTimer;
  let journeyResizeRevision = 0;
  let scrollCheckQueued = false;
  const compactHeaderMedia = window.matchMedia('(max-width: 1024px)');
  let headerIsSplit = false;

  function updateHeaderState() {
    const forceCompactHeader = compactHeaderMedia.matches;
    const nextSplit = forceCompactHeader ? true : (headerIsSplit ? window.scrollY > 44 : window.scrollY > 105);
    if (nextSplit === headerIsSplit && siteHeader.classList.contains('is-split') === nextSplit) return;
    headerIsSplit = nextSplit;
    siteHeader.classList.toggle('is-split', headerIsSplit);
  }

  function moveHighlight(track, pill, target) {
    if (!target || track.getClientRects().length === 0 || !target.offsetWidth) return;
    const trackRect = track.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    // Work in the track's unscaled coordinates so the pill stays centered
    // while the navigation bar scales into and out of its compact state.
    const scaleX = trackRect.width / track.offsetWidth || 1;
    const scaleY = trackRect.height / track.offsetHeight || 1;
    const width = target.offsetWidth;
    const height = target.offsetHeight;
    const x = (targetRect.left + targetRect.width / 2 - trackRect.left) / scaleX - track.clientLeft - width / 2;
    const y = (targetRect.top + targetRect.height / 2 - trackRect.top) / scaleY
      - track.clientTop - height / 2;
    pill.style.width = `${width}px`;
    pill.style.height = `${height}px`;
    pill.style.transform = `translate3d(${x}px,${y}px,0)`;
    pill.style.opacity = '1';
    if (track === navLinks) {
      const centerPercent = ((x + width / 2) / track.offsetWidth) * 100;
      track.style.setProperty('--active-glow-x', `${Math.max(0, Math.min(100, centerPercent)).toFixed(1)}%`);
    }
    if (!track.classList.contains('is-slider-ready')) {
      requestAnimationFrame(() => track.classList.add('is-slider-ready'));
    }
  }

  function activeNavLink() {
    return allNavLinks.find(link => link.classList.contains('is-active')) || allNavLinks[0];
  }
  function updateNavHighlight() {
    moveHighlight(navLinks, navSlider, activeNavLink());
  }
  function setActiveNav(link) {
    if (!link) return;
    allNavLinks.forEach(item => {
      const active = item === link;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'location');
      else item.removeAttribute('aria-current');
    });
    updateNavHighlight();
  }


  function finishNavTravel(force = false) {
    if (!scrollingToNav) return;
    const destination = document.getElementById(scrollingToNav);
    const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const atBottom = scrollingToNav === 'certifications' &&
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 6;
    if (!force && destination && Math.abs(destination.getBoundingClientRect().top - offset) > 60 && !atBottom) return;
    scrollingToNav = null;
    clearTimeout(navigationUnlockTimer);
  }
  window.addEventListener('scrollend', () => finishNavTravel(false));

  allNavLinks.forEach(link => link.addEventListener('click', event => {
    const hash = link.getAttribute('href');
    const destination = document.getElementById(hash.slice(1));
    if (!destination) return;
    event.preventDefault();
    scrollingToNav = destination.id;
    clearTimeout(navigationUnlockTimer);
    navigationUnlockTimer = setTimeout(() => finishNavTravel(true), 2200);
    setActiveNav(link);
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    destination.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    if (prefersReducedMotion) finishNavTravel(true);
  }));

  function updateActiveFromScroll() {
    if (scrollingToNav) return;
    const marker = Math.min(window.innerHeight * .36, 330);
    let current = trackedSections[0];
    for (const section of trackedSections) {
      if (section.getBoundingClientRect().top <= marker) current = section;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 6) {
      current = trackedSections[trackedSections.length - 1];
    }
    const link = allNavLinks.find(item => item.getAttribute('href') === `#${current.id}`);
    if (link && link !== activeNavLink()) setActiveNav(link);
  }
  window.addEventListener('scroll', () => {
    if (scrollCheckQueued) return;
    scrollCheckQueued = true;
    requestAnimationFrame(() => {
      scrollCheckQueued = false;
      updateHeaderState();
      if (!scrollingToNav) updateActiveFromScroll();
    });
  }, { passive: true });
  window.addEventListener('popstate', () => {
    const selected = allNavLinks.find(link => link.getAttribute('href') === window.location.hash);
    if (selected) setActiveNav(selected);
    requestAnimationFrame(updateActiveFromScroll);
  });

  function selectedJourneyTab() {
    return tabs.find(tab => tab.classList.contains('is-selected')) || tabs[0];
  }
  function updateJourneyHighlight() {
    const target = selectedJourneyTab();
    tabs.forEach(tab => tab.classList.toggle('is-highlighted', tab === target));
    moveHighlight(journeyTabList, journeySlider, target);
  }
  function selectJourneyTab(selected, focus = false) {
    const previous = selectedJourneyTab();
    const changingPanel = selected !== previous;
    const revision = changingPanel ? ++journeyResizeRevision : journeyResizeRevision;
    if (changingPanel) {
      journeyPanels.style.height = `${journeyPanels.getBoundingClientRect().height}px`;
    }
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.classList.toggle('is-selected', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      panel.hidden = !active;
    });
    if (changingPanel) {
      const newPanel = document.getElementById(selected.getAttribute('aria-controls'));
      const targetHeight = newPanel.scrollHeight;
      newPanel.classList.add('is-entering');
      requestAnimationFrame(() => {
        if (revision !== journeyResizeRevision) return;
        journeyPanels.style.height = `${targetHeight}px`;
        newPanel.classList.remove('is-entering');
      });
    }
    updateJourneyHighlight();
    if (focus) selected.focus();
  }
  journeyPanels.addEventListener('transitionend', event => {
    if (event.target === journeyPanels && event.propertyName === 'height') journeyPanels.style.height = '';
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectJourneyTab(tab));
    tab.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectJourneyTab(tabs[next], true);
    });
  });


  // Preserve the compact, centered nav bar's intrinsic width BEFORE equalizing
  // the five link slots. The moving highlight is the only larger element.
  function preserveCompactNavWidth() {
    navLinks.classList.remove('nav-even-slots');
    navLinks.style.removeProperty('width');
    if (window.matchMedia('(max-width: 760px)').matches) return;
    // Width belongs to CSS so the outer glass bar cannot accidentally grow.
    navLinks.classList.add('nav-even-slots');
  }

  function alignHighlights() {
    navLinks.classList.remove('is-slider-ready');
    journeyTabList.classList.remove('is-slider-ready');
    updateNavHighlight();
    updateJourneyHighlight();
  }
  preserveCompactNavWidth();
  alignHighlights();
  updateHeaderState();
  window.addEventListener('resize', () => {
    preserveCompactNavWidth();
    alignHighlights();
  }, { passive: true });
  if ('ResizeObserver' in window) {
    const pillResizeObserver = new ResizeObserver(alignHighlights);
    pillResizeObserver.observe(navLinks);
    pillResizeObserver.observe(journeyTabList);
    allNavLinks.forEach(link => pillResizeObserver.observe(link));
    tabs.forEach(tab => pillResizeObserver.observe(tab));
  }
  document.fonts?.ready.then(() => {
    preserveCompactNavWidth();
    alignHighlights();
  });
  window.addEventListener('pageshow', () => requestAnimationFrame(alignHighlights));
  window.visualViewport?.addEventListener('resize', alignHighlights, { passive: true });

  const resumeLink = document.querySelector('.resume-placeholder');
  const resumeLabel = resumeLink?.querySelector('.resume-button-label');
  const resumeFeedback = document.querySelector('.resume-download-feedback');
  let resumeFeedbackTimer;
  let resumeStartTimer;
  resumeLink?.addEventListener('click', event => {
    // Let browsers handle modified clicks normally.
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    clearTimeout(resumeFeedbackTimer);
    clearTimeout(resumeStartTimer);
    resumeLink.classList.remove('is-success');
    resumeLink.classList.add('is-downloading');
    resumeLabel.textContent = 'Starting download';
    if (resumeFeedback) resumeFeedback.textContent = '';
    // The anchor retains its native download behavior; this acknowledges the
    // initiated browser download, not a claim that a file was saved successfully.
    resumeStartTimer = setTimeout(() => {
      resumeLink.classList.remove('is-downloading');
      resumeLink.classList.add('is-success');
      resumeLabel.textContent = 'Download started';
      if (resumeFeedback) resumeFeedback.textContent = 'Check your downloads';
      resumeFeedbackTimer = setTimeout(() => {
        resumeLink.classList.remove('is-success');
        resumeLabel.textContent = 'Download my résumé';
        if (resumeFeedback) resumeFeedback.textContent = '';
      }, prefersReducedMotion ? 1300 : 2100);
    }, prefersReducedMotion ? 0 : 220);
  });

  const initialLink = allNavLinks.find(link => link.getAttribute('href') === window.location.hash);
  if (initialLink) setActiveNav(initialLink);
  else requestAnimationFrame(updateActiveFromScroll);

  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -35px 0px' });
    document.querySelectorAll('.reveal:not(.story-card)').forEach(el => revealObserver.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  }

  const chapterTrack = document.querySelector('.leadership-stories');
  const chapterCards = chapterTrack ? [...chapterTrack.querySelectorAll('.story-card')] : [];
  if (!prefersReducedMotion && chapterTrack && chapterCards.length) {
    chapterTrack.classList.add('is-scroll-driven');
    const clamp01 = value => Math.max(0, Math.min(1, value));
    let chapterFrame = 0;

    function updateChapterProgress() {
      chapterFrame = 0;
      const viewportHeight = window.innerHeight || 1;
      const trackBox = chapterTrack.getBoundingClientRect();
      const lineLength = Math.max(1, trackBox.height - 47);
      const lineProgress = clamp01((viewportHeight * .75 - trackBox.top) / lineLength);
      chapterTrack.style.setProperty('--timeline-progress', lineProgress.toFixed(4));

      const revealStart = viewportHeight * .90;
      const revealEnd = viewportHeight * .55;
      chapterCards.forEach(card => {
        const top = card.getBoundingClientRect().top;
        const progress = clamp01((revealStart - top) / (revealStart - revealEnd));
        const eased = progress * progress * (3 - 2 * progress);
        card.style.setProperty('--chapter-progress', eased.toFixed(4));
        card.style.setProperty('--chapter-opacity', (.12 + .88 * eased).toFixed(4));
        card.style.setProperty('--chapter-shift', `${((1 - eased) * 38).toFixed(2)}px`);
      });
    }

    function scheduleChapterProgress() {
      if (chapterFrame) return;
      chapterFrame = requestAnimationFrame(updateChapterProgress);
    }

    updateChapterProgress();
    window.addEventListener('scroll', scheduleChapterProgress, { passive: true });
    window.addEventListener('resize', scheduleChapterProgress, { passive: true });
    document.fonts?.ready.then(scheduleChapterProgress);
  }

  // Continuous three-card deck. No cloned cards, native scroll position, or
  // end-to-start scroll resets: every transition, including 03 -> 01, animates
  // the same three cards around the viewport's middle axis.
  const projectCarousel = document.querySelector('.project-carousel');
  if (projectCarousel) {
    const slides = [...projectCarousel.querySelectorAll('.project-slide')];
    const counter = document.querySelector('[data-project-current]');
    const total = document.querySelector('[data-project-total]');
    const back = document.querySelector('[data-carousel-dir="-1"]');
    const next = document.querySelector('[data-carousel-dir="1"]');
    const totalSlides = slides.length;
    let selected = 0;
    let pointer = null;
    let ignoreClick = false;
    let motionTimer = null;
    let hasRendered = false;

    function settleCards() {
      slides.forEach(slide => {
        slide.classList.remove('is-arriving','is-departing','is-crossing');
      });
    }

    if (total) total.textContent = String(totalSlides).padStart(2, '0');
    if (back) back.disabled = totalSlides < 2;
    if (next) next.disabled = totalSlides < 2;

    function display(index) {
      if (!totalSlides) return;
      const destination = (index + totalSlides) % totalSlides;
      if (hasRendered && destination === selected) return;
      clearTimeout(motionTimer);
      settleCards();
      const departing = hasRendered ? selected : -1;
      selected = destination;
      slides.forEach((slide, i) => {
        if (hasRendered && i === selected) slide.classList.add('is-arriving');
        if (hasRendered && i === departing) slide.classList.add('is-departing');
        const diff = (i - selected + totalSlides) % totalSlides;
        const position = diff === 0 ? 'center' : diff === 1 ? 'right' : 'left';
        slide.dataset.position = position;
        slide.classList.toggle('is-current', position === 'center');
        slide.classList.toggle('is-neighbor', position !== 'center');
        slide.setAttribute('aria-hidden', String(position !== 'center'));
        slide.tabIndex = position === 'center' ? 0 : -1;
        if (position === 'center') slide.setAttribute('aria-current', 'true');
        else slide.removeAttribute('aria-current');
      });
      if (counter) counter.textContent = String(selected + 1).padStart(2, '0');
      if (hasRendered) motionTimer = setTimeout(settleCards, 850);
      hasRendered = true;
    }

    function advance(direction) { display(selected + direction); }
    back?.addEventListener('click', () => advance(-1));
    next?.addEventListener('click', () => advance(1));

    projectCarousel.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') display(0);
      else if (event.key === 'End') display(totalSlides - 1);
      else advance(event.key === 'ArrowRight' ? 1 : -1);
    });

    slides.forEach((slide, i) => {
      slide.addEventListener('click', () => {
        if (ignoreClick) return;
        if (i !== selected) display(i);
      });
    });

    // Handle mouse dragging and touch swipes. Vertical touch scrolling remains
    // available because the stage uses touch-action: pan-y in CSS.
    projectCarousel.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointer = {id:event.pointerId, x:event.clientX, y:event.clientY};
      ignoreClick = false;
      if (event.pointerType === 'mouse') {
        // Preserve native clicks on the visible left/right card previews.
      }
    });
    projectCarousel.addEventListener('pointermove', event => {
      if (!pointer || pointer.id !== event.pointerId || event.pointerType !== 'mouse') return;
      if (Math.abs(event.clientX - pointer.x) > 6) {
        projectCarousel.classList.add('is-dragging');
        if (!projectCarousel.hasPointerCapture(event.pointerId)) projectCarousel.setPointerCapture(event.pointerId);
      }
    });
    projectCarousel.addEventListener('pointerup', event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer = null;
      projectCarousel.classList.remove('is-dragging');
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        ignoreClick = true;
        advance(dx < 0 ? 1 : -1);
        requestAnimationFrame(() => { ignoreClick = false; });
      }
    });
    projectCarousel.addEventListener('pointercancel', () => {
      pointer = null;
      projectCarousel.classList.remove('is-dragging');
    });
    display(0);
  }

})();

/* Subtle lens glints respond to input rather than running a decorative loop. */
if (matchMedia('(hover:hover) and (pointer:fine)').matches &&
    !matchMedia('(prefers-reduced-motion:reduce)').matches) {
  document.querySelectorAll('.project-carousel-arrow,.nav-links,.contact-rail').forEach(lens => {
    lens.addEventListener('pointermove', event => {
      const rect=lens.getBoundingClientRect();
      lens.style.setProperty('--glint-x', `${Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100)).toFixed(1)}%`);
      lens.style.setProperty('--glint-y', `${Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100)).toFixed(1)}%`);
    },{passive:true});
    lens.addEventListener('pointerleave',()=>{
      lens.style.removeProperty('--glint-x');
      lens.style.removeProperty('--glint-y');
    });
  });
}

/* Context-aware glass separation. Apple's material increases separation when
   text passes beneath a floating control. On the web, we infer this from
   visible DOM text bounds (rather than trying to read protected screen pixels).
   The lens stays translucent; only the contrast of its backing layer changes. */
(() => {
  const header = document.querySelector('.site-header');
  const lens = header?.querySelector('.nav-links');
  if (!header || !lens) return;
  const textTargets = Array.from(document.querySelectorAll(
    'main h1,main h2,main h3,main p,main .section-index,main .micro-label,main .project-category'
  ));
  let pending = false;
  const inspect = () => {
    pending = false;
    const r = lens.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const overlap = textTargets.some(node => {
      // Ignore offscreen/hidden tab contents.
      if (!node.getClientRects().length) return false;
      const a = node.getBoundingClientRect();
      return a.width > 0 && a.height > 0 &&
        a.left < r.right - 8 && a.right > r.left + 8 &&
        a.top < r.bottom - 5 && a.bottom > r.top + 5;
    });
    header.classList.toggle('glass-over-text', overlap);
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(inspect);
  };
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  window.addEventListener('pageshow', schedule);
  document.fonts?.ready.then(schedule);
  schedule();
})();
