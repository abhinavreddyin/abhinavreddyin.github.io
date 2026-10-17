(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motion = { duration: 600, stagger: 65, distance: 18, easing: 'cubic-bezier(.22,1,.36,1)' };
  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
  const panels = $$('.interest-panel');
  const choices = $$('.interest-choice');
  const engine = $('.engine');
  const rotor = $('.engine-rotor');
  const pause = $('.engine-pause');
  const header = $('.header');
  const readingLine = $('.reading-line');
  let current = panels[0]?.id;
  let lastTrigger = null;
  const announce = document.createElement('p');
  announce.className = 'sr-only';
  announce.setAttribute('role', 'status');
  $('.interest-lab')?.append(announce);

  function selectInterest(id, { scroll = false, announceChange = true } = {}) {
    const target = panels.find(p => p.id === id);
    if (!target) return;
    const changed = current !== id;
    const index = panels.indexOf(target);
    // The target remains ordinary server-rendered content, including without JS.
    for (const panel of panels) {
      panel.hidden = panel !== target;
      panel.classList.toggle('selected', panel === target);
    }
    for (const choice of choices) {
      const selected = choice.dataset.interest === id;
      choice.classList.toggle('selected', selected);
      if (selected) choice.setAttribute('aria-current', 'true');
      else choice.removeAttribute('aria-current');
    }
    $$('.engine-node').forEach((node,i) => node.classList.toggle('selected', i === index));
    if (rotor) rotor.style.transform = `rotate(${index * 18}deg)`;
    current = id;
    if (changed && announceChange) announce.textContent = `Exploring ${choices[index]?.querySelector('span:nth-child(2)').textContent.trim()}. ${$('h3', target).textContent}`;
    if (changed && !reduced.matches && typeof target.animate === 'function') {
      $('.panel-content', target).animate([
        { opacity: .3, transform: `translateY(${motion.distance}px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: motion.duration, easing: motion.easing });
      $('.interest-symbol',target).animate([
        { opacity: .3, transform: 'scale(.94)' },
        { opacity: 1, transform: 'scale(1)' }
      ], { duration: motion.duration + 100, easing: motion.easing });
    }
    if (scroll) {
      $('#interests').scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
      choices[index]?.focus({ preventScroll: true });
    }
  }
  // Install handlers before adding the enhancement class. A partial failure never hides content.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('[data-interest], [data-interest-link]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const id = link.dataset.interest || link.dataset.interestLink;
    if (!panels.some(p => p.id === id)) return;
    event.preventDefault();
    if (location.hash !== `#${id}`) history.pushState({ interest: id }, '', `#${id}`);
    selectInterest(id, { scroll: !link.matches('.interest-choice') });
  });
  const syncHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (panels.some(p => p.id === id)) selectInterest(id, { announceChange: false });
  };
  window.addEventListener('hashchange', syncHash);
  window.addEventListener('popstate', syncHash);
  selectInterest(panels.some(p=>p.id === location.hash.slice(1)) ? location.hash.slice(1) : current, { announceChange: false });
  document.documentElement.classList.add('enhanced');

  if (pause) {
    pause.hidden = false;
    pause.addEventListener('click', () => {
      const paused = engine.classList.toggle('paused');
      pause.setAttribute('aria-pressed', String(paused));
      pause.setAttribute('aria-label', `${paused ? 'Resume' : 'Pause'} curiosity map animation`);
      pause.textContent = paused ? '▷ RESUME' : 'Ⅱ PAUSE';
    });
    $('.engine-sweep')?.addEventListener('animationend', () => { pause.hidden = true; });
  }
  let frame = 0;
  function updateScroll() {
    frame = 0;
    header?.classList.toggle('scrolled', window.scrollY > 20);
    if (window.scrollY < 100) $$('[data-nav]').forEach(link => { link.classList.remove('active'); link.removeAttribute('aria-current'); });
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (readingLine) readingLine.style.transform = `scaleX(${total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0})`;
  }
  window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(updateScroll); }, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });
  updateScroll();

  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        $$('[data-nav]').forEach(link => {
          const active = link.dataset.nav === entry.target.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    }, { rootMargin: '-15% 0px -45% 0px', threshold: 0 });
    ['about', 'interests', 'connect'].forEach(id => navObserver.observe(document.getElementById(id)));
    if (!reduced.matches) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach((entry,index) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          if (typeof el.animate === 'function') el.animate([
            { opacity: .35, transform: `translateY(${motion.distance}px)` },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: motion.duration, delay: Math.min(index,2) * motion.stagger, easing: motion.easing });
          observer.unobserve(el);
        });
      }, { threshold: .15 });
      $$('[data-reveal], .section-heading, .about-grid, .offscreen-grid').forEach(el=>observer.observe(el));
    }
  }
  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  engine?.addEventListener('pointermove', event => {
    if (!finePointer.matches || reduced.matches) return;
    const rect = engine.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - .5) * 5;
    pointerY = ((event.clientY - rect.top) / rect.height - .5) * 5;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(() => {
      $('.engine-svg').style.transform = `perspective(900px) rotateX(${-pointerY}deg) rotateY(${pointerX}deg)`;
      pointerFrame = 0;
    });
  });
  engine?.addEventListener('pointerleave', () => {
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    $('.engine-svg').style.transform = '';
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      $('.engine-svg').style.transform = '';
      document.getAnimations().forEach(animation => animation.finish());
    }
  });

  const share = $('.share-button');
  const dialog = $('.share-dialog');
  const input = $('#share-url');
  const copy = $('.copy-button');
  const status = $('.copy-status');
  if (share && typeof dialog?.showModal === 'function' && location.protocol !== 'file:') {
    share.hidden = false;
    share.addEventListener('click', () => {
      lastTrigger = document.activeElement;
      input.value = `${location.origin}${location.pathname}`;
      status.textContent = 'Copy the link to share this portfolio.';
      dialog.showModal();
      input.focus();
      input.select();
    });
    copy.addEventListener('click', async () => {
      copy.disabled = true;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(input.value);
        status.textContent = 'Link copied. Ready to share.';
      } catch {
        input.focus(); input.select();
        status.textContent = 'The link is selected. Use your device’s Copy command to copy it.';
      } finally { copy.disabled = false; }
    });
    dialog.addEventListener('close', () => lastTrigger?.focus());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
  }
})();
