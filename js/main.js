// ============================================================
// M.L. Goodlow — site interactions
// GSAP + ScrollTrigger + Lenis drive all motion. Three.js (background
// particles) is loaded lazily so a slow CDN can never block navigation.
// ============================================================

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const hasGSAP = typeof window.gsap !== 'undefined';
const hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
const animate = hasGSAP && !reduceMotion;

if (hasST) gsap.registerPlugin(ScrollTrigger);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ============== Custom Cursor (mouse devices only) ==============
const cursorDot = $('.cursor-dot');
const cursorOutline = $('.cursor-outline');
const HOVER_TARGETS = 'a, button, [data-page], .book-card, .blog-card, .gallery-grid-item, .home-gallery-item, .gallery-item, .headshot-item';

if (finePointer && cursorDot && cursorOutline) {
  window.addEventListener('mousemove', (e) => {
    cursorDot.style.left = e.clientX + 'px';
    cursorDot.style.top = e.clientY + 'px';
    cursorOutline.style.left = e.clientX + 'px';
    cursorOutline.style.top = e.clientY + 'px';
    document.body.classList.add('cursor-ready');
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => document.body.classList.remove('cursor-ready'));
  // Delegated, so it also covers elements the hover list never reached before
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(HOVER_TARGETS)) cursorOutline.classList.add('hover');
  });
  document.addEventListener('mouseout', (e) => {
    const from = e.target.closest(HOVER_TARGETS);
    if (from && !from.contains(e.relatedTarget)) cursorOutline.classList.remove('hover');
  });
}

// ============== Lenis Smooth Scroll ==============
let lenis = null;
if (animate && typeof window.Lenis !== 'undefined') {
  try {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false
    });
    if (hasST) lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } catch (e) {
    console.warn('Lenis init skipped:', e);
    lenis = null;
  }
}

let scrollLocks = 0;
function lockScroll() {
  scrollLocks++;
  if (lenis) lenis.stop();
  document.documentElement.style.overflow = 'hidden';
}
function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks) return;
  if (lenis) lenis.start();
  document.documentElement.style.overflow = '';
}
function scrollToTop(immediate) {
  if (lenis) lenis.scrollTo(0, { immediate: !!immediate, force: true });
  else window.scrollTo({ top: 0, behavior: immediate || reduceMotion ? 'auto' : 'smooth' });
}

// ============== Navigation & Mobile Menu ==============
const nav = $('#nav');
const navMenu = $('#navMenu');
const menuToggle = $('#menuToggle');
const pageTransition = $('#pageTransition');
const pages = $$('.page');
const PAGE_IDS = pages.map(p => p.id.replace('page-', ''));
let currentPage = 'home';
let isTransitioning = false;

function setMenu(open) {
  if (!navMenu || !menuToggle) return;
  const isOpen = navMenu.classList.contains('open');
  if (open === isOpen) return;
  navMenu.classList.toggle('open', open);
  menuToggle.classList.toggle('open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  if (open) lockScroll();
  else unlockScroll();
}

if (menuToggle) menuToggle.addEventListener('click', () => setMenu(!navMenu.classList.contains('open')));
document.addEventListener('click', (e) => {
  if (!navMenu || !navMenu.classList.contains('open')) return;
  if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) setMenu(false);
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false);
});
window.matchMedia('(min-width: 1200px)').addEventListener('change', (mq) => {
  if (mq.matches) setMenu(false);
});

function updateNavState() {
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
}
window.addEventListener('scroll', updateNavState, { passive: true });
updateNavState();

// Every [data-page] element becomes a real, keyboard-reachable link
$$('[data-page]').forEach(el => {
  const id = el.dataset.page;
  if (el.tagName === 'A') {
    if (!el.hasAttribute('href')) el.setAttribute('href', '#' + id);
  } else if (el.tagName !== 'BUTTON') {
    el.tabIndex = 0;
    el.setAttribute('role', 'link');
  }
});

document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-page]');
  if (!link) return;
  // Let ctrl/cmd/shift-click open real links in a new tab
  if (link.tagName === 'A' && (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)) return;
  e.preventDefault();
  navigateToPage(link.dataset.page);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target;
  if (el.getAttribute && el.getAttribute('role') === 'link' && el.dataset.page) {
    e.preventDefault();
    navigateToPage(el.dataset.page);
  }
});

function pageFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  return PAGE_IDS.includes(id) ? id : 'home';
}

function setActivePage(pageId) {
  pages.forEach(p => p.classList.toggle('active', p.id === `page-${pageId}`));
  $$('.nav-link').forEach(link => {
    const on = link.dataset.page === pageId;
    link.classList.toggle('active', on);
    if (on) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  currentPage = pageId;
}

function showPage(pageId) {
  setActivePage(pageId);
  scrollToTop(true);
  updateNavState();
  activatePage($(`#page-${pageId}`));
}

function navigateToPage(pageId, opts = {}) {
  if (!PAGE_IDS.includes(pageId)) return;
  setMenu(false);
  if (pageId === currentPage) {
    scrollToTop(false);
    return;
  }
  if (isTransitioning) return;
  if (opts.push !== false) history.pushState({ page: pageId }, '', '#' + pageId);

  if (!animate) {
    showPage(pageId);
    return;
  }
  isTransitioning = true;
  gsap.timeline({ onComplete: () => { isTransitioning = false; } })
    .to(pageTransition, { y: '0%', duration: 0.5, ease: 'power3.inOut' })
    .call(() => showPage(pageId))
    .to(pageTransition, { y: '-100%', duration: 0.5, ease: 'power3.inOut', delay: 0.05 });
}

window.addEventListener('popstate', () => {
  const id = pageFromHash();
  if (id !== currentPage) navigateToPage(id, { push: false });
});

// ============== Scroll Reveals ==============
// One system for every page: elements start hidden, then reveal once as they
// enter the viewport. Elements already on screen reveal immediately, staggered.
// (Previously a page-enter tween and separate ScrollTrigger batches animated the
// same elements twice, re-hid them on every scroll pass, and fought CSS transitions.)
const REVEAL_SELECTOR = [
  '.section-header', '.manifesto-text', '.stat-item', '.about-intro', '.featured-book',
  '.duality-card', '.about-quote', '.about-gallery .gallery-item', '.book-card', '.blog-card',
  '.testimonials-featured', '.media-header-quote', '.press-kit-text', '.headshot-item',
  '.store-hero-text', '.store-featured-product', '.product-card', '.home-gallery-item',
  '.gallery-filters', '.gallery-grid-item', '.contact-form', '.contact-sidebar', '.newsletter-block'
].join(', ');

let revealTriggers = [];

function finishReveal(els) {
  gsap.set(els, { clearProps: 'transform,opacity' });
  els.forEach(el => el.classList.remove('reveal-pending'));
}

function setupReveals(page) {
  revealTriggers.forEach(t => t.kill());
  revealTriggers = [];
  if (!page || !animate || !hasST) return;

  const els = $$(REVEAL_SELECTOR, page).filter(el => el.offsetParent !== null);
  if (!els.length) return;
  els.forEach(el => el.classList.add('reveal-pending'));
  gsap.set(els, { opacity: 0, y: 40 });

  revealTriggers = ScrollTrigger.batch(els, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
        overwrite: true,
        onComplete: () => finishReveal(batch)
      });
    }
  });
}

// ============== Stat Count-Up ==============
let counterTriggers = [];

function setupCounters(page) {
  counterTriggers.forEach(t => t.kill());
  counterTriggers = [];
  if (!page) return;
  $$('.stat-num', page).forEach(el => {
    // Count inside the <em> when present so its gold italic styling survives
    const target = el.querySelector('em') || el;
    if (!target.dataset.raw) target.dataset.raw = target.textContent.trim();
    const raw = target.dataset.raw;
    target.textContent = raw;
    const num = parseInt(raw, 10);
    if (!animate || !hasST || isNaN(num)) return;
    const suffix = raw.replace(/^[0-9]+/, '');
    const counter = { val: 0 };
    target.textContent = '0' + suffix;
    counterTriggers.push(ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          val: num,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => { target.textContent = Math.round(counter.val) + suffix; },
          onComplete: () => { target.textContent = raw; }
        });
      }
    }));
  });
}

// ============== Hero Intro ==============
function heroParts() {
  return {
    lines: $$('#page-home .hero-title .ln span'),
    text: $$('#page-home .hero-text > *:not(.hero-title)'),
    visual: $('#page-home .hero-visual')
  };
}

function hideHero() {
  if (!animate) return;
  const { lines, text, visual } = heroParts();
  gsap.set(lines, { yPercent: 110, opacity: 0 });
  gsap.set(text, { y: 60, opacity: 0 });
  if (visual) gsap.set(visual, { x: 60, opacity: 0, scale: 0.95 });
}

function playHeroIntro(delay = 0) {
  if (!animate) return;
  const { lines, text, visual } = heroParts();
  gsap.to(lines, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.1, ease: 'power4.out', delay, overwrite: true });
  gsap.to(text, { y: 0, opacity: 1, duration: 1.2, stagger: 0.12, ease: 'power3.out', delay: delay + 0.35, overwrite: true });
  if (visual) {
    gsap.to(visual, {
      x: 0, opacity: 1, scale: 1, duration: 1.4, ease: 'power3.out', delay: delay + 0.45, overwrite: true,
      onComplete: () => gsap.set(visual, { clearProps: 'transform,opacity' })
    });
  }
}

function activatePage(page) {
  if (!page) return;
  if (page.id === 'page-home') {
    hideHero();
    playHeroIntro(0.15);
  }
  setupCounters(page);
  setupReveals(page);
  if (hasST) ScrollTrigger.refresh();
}

// ============== Parallax (about portraits) ==============
if (animate && hasST) {
  $$('.about-intro').forEach(container => {
    const img = container.querySelector('.about-img-1');
    if (!img) return;
    gsap.to(img, {
      yPercent: -15,
      ease: 'none',
      scrollTrigger: { trigger: container, start: 'top bottom', end: 'bottom top', scrub: 1 }
    });
  });
}

// Lazy images change layout as they arrive: keep trigger positions accurate
if (hasST) {
  let refreshTimer;
  document.addEventListener('load', (e) => {
    if (e.target.tagName !== 'IMG') return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
  }, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
}

// ============== Three.js Background (lazy) ==============
const bgCanvas = $('#bg-canvas');
if (bgCanvas) {
  import('three')
    .then((THREE) => initThree(THREE, bgCanvas))
    .catch((e) => console.warn('Three.js background skipped:', e));
}

function createParticleTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function makeField(THREE, { count, spreadX, spreadY, spreadZ, speed, color, size, opacity, texture }) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const data = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spreadX;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spreadY;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spreadZ;
    data.push({
      speedX: (Math.random() - 0.5) * speed[0],
      speedY: -Math.random() * speed[1] - speed[2],
      speedZ: (Math.random() - 0.5) * speed[3]
    });
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color, size, map: texture, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  const points = new THREE.Points(geometry, material);
  points.userData.data = data;
  return points;
}

function initThree(THREE, canvas) {
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 8;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const texture = createParticleTexture(THREE);
    const petals = makeField(THREE, {
      count: 150, spreadX: 30, spreadY: 20, spreadZ: 15,
      speed: [0.008, 0.012, 0.003, 0.005], color: 0x3f8fd6, size: 0.18, opacity: 0.75, texture
    });
    const iceCrystals = makeField(THREE, {
      count: 250, spreadX: 40, spreadY: 25, spreadZ: 20,
      speed: [0.004, 0.005, 0.001, 0.003], color: 0xa9c4de, size: 0.08, opacity: 0.55, texture
    });
    scene.add(petals, iceCrystals);

    let mouseX = 0;
    let mouseY = 0;
    if (finePointer) {
      window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (reduceMotion) renderer.render(scene, camera);
    });

    if (reduceMotion) {
      renderer.render(scene, camera);
      return;
    }

    const tick = () => {
      requestAnimationFrame(tick);
      const now = Date.now();
      {
        const p = petals.geometry.attributes.position.array;
        const d = petals.userData.data;
        for (let i = 0; i < d.length; i++) {
          p[i * 3] += d[i].speedX + Math.sin(now * 0.0005 + i) * 0.002;
          p[i * 3 + 1] += d[i].speedY;
          p[i * 3 + 2] += d[i].speedZ;
          if (p[i * 3 + 1] < -12) {
            p[i * 3 + 1] = 12;
            p[i * 3] = (Math.random() - 0.5) * 30;
          }
          if (p[i * 3] > 15) p[i * 3] = -15;
          if (p[i * 3] < -15) p[i * 3] = 15;
        }
        petals.geometry.attributes.position.needsUpdate = true;
        petals.rotation.y += 0.0008;
      }
      {
        const p = iceCrystals.geometry.attributes.position.array;
        const d = iceCrystals.userData.data;
        for (let i = 0; i < d.length; i++) {
          p[i * 3] += d[i].speedX;
          p[i * 3 + 1] += d[i].speedY;
          p[i * 3 + 2] += d[i].speedZ;
          if (p[i * 3 + 1] < -12) {
            p[i * 3 + 1] = 12;
            p[i * 3] = (Math.random() - 0.5) * 40;
          }
        }
        iceCrystals.geometry.attributes.position.needsUpdate = true;
        iceCrystals.rotation.y -= 0.0004;
      }
      camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 0.5 - camera.position.y) * 0.04;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    };
    tick();
  } catch (e) {
    console.warn('Three.js init error:', e);
  }
}

// ============== Forms ==============
const contactForm = $('#contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let firstInvalid = null;
    contactForm.querySelectorAll('[required]').forEach(field => {
      const wrapper = field.closest('.form-field');
      if (!wrapper) return;
      const value = field.value.trim();
      const ok = value && (field.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
      wrapper.classList.toggle('error', !ok);
      field.setAttribute('aria-invalid', String(!ok));
      if (!ok && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    const success = $('#formSuccess');
    success.classList.add('show');
    contactForm.reset();
    setTimeout(() => success.classList.remove('show'), 5000);
  });
  contactForm.querySelectorAll('input, textarea').forEach(field => {
    field.addEventListener('input', () => {
      const w = field.closest('.form-field');
      if (w) w.classList.remove('error');
      field.removeAttribute('aria-invalid');
    });
  });
}

function setupNewsletter(formId, successId) {
  const form = document.getElementById(formId);
  const success = document.getElementById(successId);
  if (!form || !success) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]');
    if (email && email.value.trim()) {
      success.classList.add('show');
      form.reset();
      setTimeout(() => success.classList.remove('show'), 4000);
    }
  });
}
setupNewsletter('newsletterForm', 'newsletterSuccess');
setupNewsletter('newsletterFormInline', 'newsletterSuccessInline');

// ============== Toast ==============
const toast = $('#toast');
const toastMsg = $('#toastMsg');
let toastTimer;
function showToast(msg) {
  if (toastMsg) toastMsg.textContent = msg;
  if (!toast) return;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}
$$('.add-btn').forEach(btn => {
  btn.setAttribute('aria-label', btn.getAttribute('title') || 'Notify me');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const card = btn.closest('.product-card');
    const name = card ? card.querySelector('h4').textContent : 'this edition';
    showToast(`We'll notify you when ${name} is available.`);
  });
});

// ============== Magnetic Buttons & 3D Tilt (mouse only) ==============
if (animate && finePointer) {
  $$('.btn').forEach(btn => {
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power2.out' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power2.out' });
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      xTo((e.clientX - rect.left - rect.width / 2) * 0.2);
      yTo((e.clientY - rect.top - rect.height / 2) * 0.3);
    });
    btn.addEventListener('mouseleave', () => {
      xTo(0);
      yTo(0);
    });
  });

  const heroMain = $('.hero-image-main');
  if (heroMain) {
    // Centre with percentages so the card stays centred at every size
    gsap.set(heroMain, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
    heroMain.addEventListener('mouseenter', () => {
      gsap.to(heroMain, { scale: 1.02, duration: 0.6, ease: 'power3.out' });
    });
    heroMain.addEventListener('mousemove', (e) => {
      const rect = heroMain.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(heroMain, {
        rotationY: x * 10, rotationX: -y * 10, transformPerspective: 800,
        duration: 0.6, ease: 'power2.out', overwrite: 'auto'
      });
    });
    heroMain.addEventListener('mouseleave', () => {
      gsap.to(heroMain, { rotationY: 0, rotationX: 0, scale: 1, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
    });
  }

  $$('.book-card-cover').forEach(cover => {
    cover.addEventListener('mousemove', (e) => {
      const rect = cover.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(cover, {
        rotationY: x * 8, rotationX: -y * 8, transformPerspective: 1000,
        duration: 0.5, ease: 'power2.out', overwrite: 'auto'
      });
    });
    cover.addEventListener('mouseleave', () => {
      gsap.to(cover, { rotationY: 0, rotationX: 0, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
    });
  });
}

// ============== Gallery: Filters + Lightbox ==============
(function () {
  const galleryGrid = $('#galleryGrid');
  const filterBtns = $$('.gallery-filter-btn');
  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightboxImg');
  const lightboxCaption = $('#lightboxCaption');
  const lightboxClose = $('#lightboxClose');
  const lightboxPrev = $('#lightboxPrev');
  const lightboxNext = $('#lightboxNext');

  if (!galleryGrid || !lightbox) return;

  let activeItems = [];
  let currentIndex = 0;
  let lastFocus = null;

  const allItems = () => $$('.gallery-grid-item', galleryGrid);
  const getVisibleItems = () => allItems().filter(el => !el.classList.contains('filtered-out'));

  // Keyboard access for every photo tile
  [...allItems(), ...$$('.home-gallery-item')].forEach(item => {
    const img = item.querySelector('img');
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    if (img && img.alt) item.setAttribute('aria-label', 'Open photo: ' + img.alt);
  });

  function updateLightbox() {
    const item = activeItems[currentIndex];
    if (!item) return;
    const img = item.querySelector('img');
    const label = item.querySelector('.gallery-grid-overlay span');
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = label ? label.textContent : '';
  }

  function openLightbox(index) {
    activeItems = getVisibleItems();
    if (!activeItems.length) return;
    currentIndex = Math.min(Math.max(index, 0), activeItems.length - 1);
    updateLightbox();
    lastFocus = document.activeElement;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    lockScroll();
    if (lightboxClose) lightboxClose.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!lightbox.classList.contains('open')) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    unlockScroll();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function step(dir) {
    if (!activeItems.length) return;
    currentIndex = (currentIndex + dir + activeItems.length) % activeItems.length;
    updateLightbox();
  }

  function openFromItem(item) {
    const index = getVisibleItems().indexOf(item);
    if (index > -1) openLightbox(index);
  }

  galleryGrid.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-grid-item');
    if (item) openFromItem(item);
  });
  galleryGrid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('.gallery-grid-item');
    if (!item) return;
    e.preventDefault();
    openFromItem(item);
  });

  function setFilter(filter) {
    filterBtns.forEach(b => {
      const on = b.dataset.filter === filter;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    allItems().forEach(item => {
      item.classList.toggle('filtered-out', !(filter === 'all' || item.dataset.category === filter));
    });
    const visible = getVisibleItems();
    if (animate) {
      visible.forEach(el => el.classList.add('reveal-pending'));
      gsap.fromTo(visible, { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: 0.5, stagger: 0.03, ease: 'power3.out', overwrite: true,
        onComplete: () => finishReveal(visible)
      });
    }
    if (hasST) ScrollTrigger.refresh();
  }

  filterBtns.forEach(btn => {
    btn.setAttribute('aria-pressed', 'false');
    // Clicking the active filter again clears it (there is no "All" button)
    btn.addEventListener('click', () => {
      setFilter(btn.classList.contains('active') ? 'all' : btn.dataset.filter);
    });
  });

  // Home teaser tiles open the same photo in the full gallery lightbox
  function openFromHomeTile(tile) {
    const src = tile.querySelector('img').getAttribute('src');
    navigateToPage('gallery');
    setTimeout(() => {
      const find = () => getVisibleItems().findIndex(el => el.querySelector('img').getAttribute('src') === src);
      let match = find();
      if (match === -1) {
        setFilter('all');
        match = find();
      }
      openLightbox(match > -1 ? match : 0);
    }, 650);
  }
  $$('.home-gallery-item').forEach(tile => {
    tile.addEventListener('click', () => openFromHomeTile(tile));
    tile.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openFromHomeTile(tile);
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxNext) lightboxNext.addEventListener('click', () => step(1));
  if (lightboxPrev) lightboxPrev.addEventListener('click', () => step(-1));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-content')) closeLightbox();
  });
  window.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'Tab') {
      // keep keyboard focus inside the open viewer
      const focusables = [lightboxClose, lightboxPrev, lightboxNext].filter(Boolean);
      const i = focusables.indexOf(document.activeElement);
      e.preventDefault();
      const next = e.shiftKey ? (i <= 0 ? focusables.length - 1 : i - 1) : (i + 1) % focusables.length;
      focusables[next].focus();
    }
  });

  // Swipe left/right on phones
  let touchX = null;
  let touchY = null;
  lightbox.addEventListener('touchstart', (e) => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });
})();

// ============== Boot: initial page + preloader exit ==============
const initialPage = pageFromHash();
setActivePage(initialPage);
// Always start at the top: a restored mid-page scroll would fire every reveal at once behind the curtain
window.scrollTo(0, 0);
scrollToTop(true);
if (initialPage === 'home') hideHero();

let booted = false;
function runPreloaderExit() {
  if (booted) return;
  booted = true;
  const page = $(`#page-${initialPage}`);
  scrollToTop(true);

  if (!animate) {
    if (pageTransition) {
      pageTransition.style.animation = 'none';
      pageTransition.style.transform = 'translateY(-100%)';
    }
    setupCounters(page);
    return;
  }

  // Hand control from the CSS fallback animation over to GSAP
  pageTransition.style.animation = 'none';
  const mark = pageTransition.querySelector('.page-transition-mark');
  const tl = gsap.timeline();
  if (mark) tl.to(mark, { opacity: 0, duration: 0.3 }, 0.15);
  tl.to(pageTransition, { y: '-100%', duration: 0.9, ease: 'power3.inOut' }, 0.35);
  // Content starts arriving while the curtain is still lifting (no pop-in after it)
  tl.call(() => {
    if (initialPage === 'home') playHeroIntro(0);
    setupCounters(page);
    setupReveals(page);
    if (hasST) ScrollTrigger.refresh();
  }, null, 0.75);
}

// Don't wait for every photo on every page: go on load, or after 2.5s at the latest
if (document.readyState === 'complete') runPreloaderExit();
else {
  window.addEventListener('load', runPreloaderExit, { once: true });
  setTimeout(runPreloaderExit, 2500);
}
